// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;
// BuildProof Registry v1.1
// Onchain Proof-of-Work for Builders on Base
// Owner: afifarioss.base.eth / 0x7845D45d9E53268EBFf3C4a9daBb994cE5b93918

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IEAS {
    struct AttestationRequest { bytes32 schema; AttestationRequestData data; }
    struct AttestationRequestData {
        address recipient; uint64 expirationTime; bool revocable;
        bytes32 refUID; bytes data; uint256 value;
    }
    function attest(AttestationRequest calldata request) external payable returns (bytes32);
}
interface ITalentProtocol { function getBuilderScore(address b) external view returns (uint256); }

contract BuildProofNFT is ERC721, Ownable {
    using SafeERC20 for IERC20;

    // ── State ──────────────────────────────────────────────
    uint256 private _nextId;

    struct ShipReceipt {
        address builder; string projectName; string description;
        string githubUrl; string category; uint256 timestamp;
        uint256 builderScore; bytes32 easUID; uint256 tips;
        bool aiVerified; uint8 aiScore;
    }

    mapping(uint256 => ShipReceipt) public receipts;
    mapping(address => uint256[])   public builderReceipts;
    mapping(address => uint256)     public builderShipCount;
    mapping(address => uint256)     public lastMintTimestamp;

    address public constant USDC   = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant EAS    = 0x4200000000000000000000000000000000000021;
    address public constant TALENT = 0x7745268Ed6e72e62AA69c97c6f7c0536e91f3eF;

    bytes32 public schemaUID;
    address public aiVerifier;
    address public protocolOwner;
    uint256 public constant TIP_FEE_BPS = 250;
    uint256 public totalProtocolFees;

    // Anti-spam: min seconds between mints per address. Owner-tunable.
    uint256 public mintCooldown = 1 hours;

    // All builders who have ever minted (insertion order — NOT ranked).
    // Kept for indexer/frontend use; do not treat as a leaderboard.
    address[] public allBuilders;
    mapping(address => bool) public hasMinted;

    // Fixed-size top-N leaderboard, kept sorted by ship count on every mint.
    uint256 public constant LEADERBOARD_SIZE = 100;
    address[LEADERBOARD_SIZE] public topBuilders; // zero-address = empty slot

    // ── Events ─────────────────────────────────────────────
    event ShipReceiptMinted(uint256 indexed tokenId, address indexed builder, string projectName, bytes32 easUID, uint256 timestamp);
    event BuildAIVerified(uint256 indexed tokenId, uint8 aiScore, bool verified);
    event TipSent(uint256 indexed tokenId, address indexed tipper, address indexed builder, uint256 amount);

    constructor(address _aiVerifier) ERC721("BuildProof Ship Receipt", "SHIP") Ownable(msg.sender) {
        aiVerifier    = _aiVerifier;
        protocolOwner = 0x7845D45d9E53268EBFf3C4a9daBb994cE5b93918;
    }

    // ── Core ───────────────────────────────────────────────
    function mintShipReceipt(
        string calldata projectName, string calldata description,
        string calldata githubUrl,   string calldata category,
        bytes  calldata easData
    ) external returns (uint256 tokenId) {
        require(bytes(projectName).length > 0,   "BP: name required");
        require(bytes(description).length >= 20, "BP: desc too short");
        require(
            block.timestamp >= lastMintTimestamp[msg.sender] + mintCooldown,
            "BP: cooldown active"
        );
        lastMintTimestamp[msg.sender] = block.timestamp;

        tokenId = ++_nextId;

        uint256 bScore;
        try ITalentProtocol(TALENT).getBuilderScore(msg.sender) returns (uint256 s) { bScore = s; } catch {}

        bytes32 uid_;
        if (schemaUID != bytes32(0)) {
            IEAS.AttestationRequest memory req = IEAS.AttestationRequest({
                schema: schemaUID,
                data: IEAS.AttestationRequestData({ recipient:msg.sender, expirationTime:0, revocable:false, refUID:bytes32(0), data:easData, value:0 })
            });
            try IEAS(EAS).attest(req) returns (bytes32 u) { uid_ = u; } catch {}
        }

        receipts[tokenId] = ShipReceipt({ builder:msg.sender, projectName:projectName, description:description,
            githubUrl:githubUrl, category:category, timestamp:block.timestamp, builderScore:bScore,
            easUID:uid_, tips:0, aiVerified:false, aiScore:0 });
        builderReceipts[msg.sender].push(tokenId);
        builderShipCount[msg.sender]++;

        if (!hasMinted[msg.sender]) { allBuilders.push(msg.sender); hasMinted[msg.sender] = true; }
        _updateTopBuilders(msg.sender);

        _safeMint(msg.sender, tokenId);
        emit ShipReceiptMinted(tokenId, msg.sender, projectName, uid_, block.timestamp);
    }

    function setAIVerification(uint256 tokenId, uint8 aiScore, bool verified) external {
        require(msg.sender == aiVerifier, "BP: not verifier");
        require(_ownerOf(tokenId) != address(0), "BP: nonexistent");
        receipts[tokenId].aiVerified = verified;
        receipts[tokenId].aiScore    = aiScore;
        emit BuildAIVerified(tokenId, aiScore, verified);
    }

    function tipBuilder(uint256 tokenId, uint256 usdcAmount) external {
        require(usdcAmount >= 1e6, "BP: min 1 USDC");
        ShipReceipt storage r = receipts[tokenId];
        require(r.builder != address(0), "BP: not found");
        require(r.builder != msg.sender,  "BP: no self-tip");

        uint256 fee = (usdcAmount * TIP_FEE_BPS) / 10_000;
        IERC20(USDC).safeTransferFrom(msg.sender, r.builder,     usdcAmount - fee);
        IERC20(USDC).safeTransferFrom(msg.sender, protocolOwner, fee);

        r.tips             += usdcAmount - fee;
        totalProtocolFees  += fee;
        emit TipSent(tokenId, msg.sender, r.builder, usdcAmount - fee);
    }

    // ── Leaderboard maintenance ────────────────────────────
    // Simple insertion-into-sorted-array. O(LEADERBOARD_SIZE) worst case,
    // bounded and cheap since LEADERBOARD_SIZE is fixed at 100.
    function _updateTopBuilders(address builder) internal {
        uint256 score = builderShipCount[builder];

        // Already ranked? Bubble to correct position.
        for (uint256 i; i < LEADERBOARD_SIZE; i++) {
            if (topBuilders[i] == builder) {
                while (i > 0 && builderShipCount[topBuilders[i - 1]] < score) {
                    (topBuilders[i - 1], topBuilders[i]) = (topBuilders[i], topBuilders[i - 1]);
                    i--;
                }
                return;
            }
        }

        // Not yet ranked — try to insert.
        for (uint256 i; i < LEADERBOARD_SIZE; i++) {
            if (topBuilders[i] == address(0) || builderShipCount[topBuilders[i]] < score) {
                for (uint256 j = LEADERBOARD_SIZE - 1; j > i; j--) {
                    topBuilders[j] = topBuilders[j - 1];
                }
                topBuilders[i] = builder;
                return;
            }
        }
    }

    // ── Views ──────────────────────────────────────────────
    /// @notice True leaderboard, sorted by ship count descending, capped at LEADERBOARD_SIZE.
    function getLeaderboard(uint256 limit) external view returns (address[] memory b, uint256[] memory c) {
        uint256 len = limit < LEADERBOARD_SIZE ? limit : LEADERBOARD_SIZE;
        uint256 actual;
        for (uint256 i; i < len; i++) {
            if (topBuilders[i] == address(0)) break;
            actual++;
        }
        b = new address[](actual);
        c = new uint256[](actual);
        for (uint256 i; i < actual; i++) {
            b[i] = topBuilders[i];
            c[i] = builderShipCount[topBuilders[i]];
        }
    }

    /// @notice All builders who have ever minted, in insertion order. Not ranked — use for indexing only.
    function getAllBuilders() external view returns (address[] memory) { return allBuilders; }

    function getBuilderReceipts(address builder) external view returns (uint256[] memory) { return builderReceipts[builder]; }
    function totalShips() external view returns (uint256) { return _nextId; }

    // ── Admin ──────────────────────────────────────────────
    function setSchemaUID(bytes32 uid)      external onlyOwner { schemaUID = uid; }
    function setAIVerifier(address v)       external onlyOwner { aiVerifier = v;  }
    function setMintCooldown(uint256 secs)  external onlyOwner { mintCooldown = secs; }
}