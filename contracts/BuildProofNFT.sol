// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IEAS {
    struct AttestationRequest { bytes32 schema; AttestationRequestData data; }
    struct AttestationRequestData {
        address recipient; uint64 expirationTime; bool revocable;
        bytes32 refUID; bytes data; uint256 value;
    }
    function attest(AttestationRequest calldata request) external payable returns (bytes32);
}

interface ITalentProtocol { function getBuilderScore(address b) external view returns (uint256); }

contract BuildProofNFT is ERC721, Ownable, Pausable {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    uint256 private _nextId;

    struct ShipReceipt {
        address builder; string projectName; string description;
        string githubUrl; string category; uint256 timestamp;
        uint256 builderScore; bytes32 easUID; uint256 tips;
        bool aiVerified; uint8 aiScore;
    }

    mapping(uint256 => ShipReceipt) public receipts;
    mapping(address => uint256[]) public builderReceipts;
    mapping(address => uint256) public builderShipCount;
    mapping(address => uint256) public lastMintTimestamp;

    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant EAS = 0x4200000000000000000000000000000000000021;
    address public constant TALENT = 0x7745268Ed6e72e62AA69c97c6f7c0536e91f3eF;

    bytes32 public schemaUID;
    address public aiVerifier;
    address public protocolOwner;
    uint256 public constant TIP_FEE_BPS = 250;
    uint256 public totalProtocolFees;
    uint256 public mintCooldown = 1 hours;

    address[] public allBuilders;
    mapping(address => bool) public hasMinted;

    uint256 public constant LEADERBOARD_SIZE = 100;
    address[LEADERBOARD_SIZE] public topBuilders;

    event ShipReceiptMinted(uint256 indexed tokenId, address indexed builder, string projectName, bytes32 easUID, uint256 timestamp);
    event BuildAIVerified(uint256 indexed tokenId, uint8 aiScore, bool verified);
    event TipSent(uint256 indexed tokenId, address indexed tipper, address indexed builder, uint256 amount);
    event ProtocolFeesWithdrawn(address indexed to, uint256 amount);
    event SchemaUIDSet(bytes32 indexed uid);
    event AIVerifierSet(address indexed verifier);
    event MintCooldownSet(uint256 seconds);
    event ProtocolOwnerSet(address indexed newOwner);

    constructor(address _aiVerifier) ERC721("BuildProof Ship Receipt", "SHIP") Ownable(msg.sender) {
        aiVerifier = _aiVerifier;
        protocolOwner = 0x7845D45d9E53268EBFf3C4a9daBb994cE5b93918;
    }

    function mintShipReceipt(
        string calldata projectName, string calldata description,
        string calldata githubUrl, string calldata category,
        bytes calldata easData
    ) external whenNotPaused returns (uint256 tokenId) {
        require(bytes(projectName).length > 0, "BP: name required");
        require(bytes(description).length >= 20, "BP: desc too short");
        require(block.timestamp >= lastMintTimestamp[msg.sender] + mintCooldown, "BP: cooldown active");
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

        receipts[tokenId] = ShipReceipt({
            builder:msg.sender, projectName:projectName, description:description,
            githubUrl:githubUrl, category:category, timestamp:block.timestamp, builderScore:bScore,
            easUID:uid_, tips:0, aiVerified:false, aiScore:0
        });
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
        receipts[tokenId].aiScore = aiScore;
        emit BuildAIVerified(tokenId, aiScore, verified);
    }

    function tipBuilder(uint256 tokenId, uint256 usdcAmount) external whenNotPaused {
        require(usdcAmount >= 1e6, "BP: min 1 USDC");
        ShipReceipt storage r = receipts[tokenId];
        require(r.builder != address(0), "BP: not found");
        require(r.builder != msg.sender, "BP: no self-tip");

        uint256 fee = (usdcAmount * TIP_FEE_BPS) / 10_000;
        uint256 builderAmount = usdcAmount - fee;

        r.tips += builderAmount;
        totalProtocolFees += fee;

        IERC20(USDC).safeTransferFrom(msg.sender, address(this), usdcAmount);
        IERC20(USDC).safeTransfer(r.builder, builderAmount);
        IERC20(USDC).safeTransfer(protocolOwner, fee);

        emit TipSent(tokenId, msg.sender, r.builder, builderAmount);
    }

    function withdrawProtocolFees() external onlyOwner {
        uint256 balance = IERC20(USDC).balanceOf(address(this));
        uint256 available = balance - _getTotalBuilderTips();
        require(available > 0, "BP: no fees");
        IERC20(USDC).safeTransfer(protocolOwner, available);
        emit ProtocolFeesWithdrawn(protocolOwner, available);
    }

    function _getTotalBuilderTips() internal view returns (uint256 total) {
        for (uint256 i = 1; i <= _nextId; i++) total += receipts[i].tips;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "BP: nonexistent");
        ShipReceipt memory r = receipts[tokenId];
        string memory svg = _generateSVG(tokenId, r);
        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"BuildProof #', tokenId.toString(),
            '","description":"', _escapeJson(r.description),
            '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '","attributes":[',
            '{"trait_type":"Project","value":"', _escapeJson(r.projectName), '"},',
            '{"trait_type":"Category","value":"', _escapeJson(r.category), '"},',
            '{"trait_type":"Builder Score","value":', r.builderScore.toString(), '},',
            '{"trait_type":"AI Score","value":', uint256(r.aiScore).toString(), '},',
            '{"trait_type":"AI Verified","value":"', r.aiVerified ? "Yes" : "No", '"},',
            '{"trait_type":"Tips","display_type":"number","value":', r.tips.toString(), '},',
            '{"trait_type":"Timestamp","display_type":"date","value":', r.timestamp.toString(), '}',
            ']}'
        ))));
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _generateSVG(uint256 tokenId, ShipReceipt memory r) internal pure returns (string memory) {
        string memory bgColor = r.aiVerified ? "#0052FF" : "#1a1a2e";
        string memory statusBadge = r.aiVerified
            ? '<rect x="280" y="20" width="90" height="24" rx="12" fill="#00D26A"/><text x="325" y="37" fill="white" font-size="11" text-anchor="middle" font-family="sans-serif">AI VERIFIED</text>'
            : '<rect x="280" y="20" width="90" height="24" rx="12" fill="#FF6B6B"/><text x="325" y="37" fill="white" font-size="11" text-anchor="middle" font-family="sans-serif">PENDING</text>';
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">',
            '<rect width="400" height="500" fill="', bgColor, '"/>',
            '<rect x="20" y="20" width="360" height="460" rx="16" fill="#0a0a1a" stroke="#0052FF" stroke-width="2"/>',
            statusBadge,
            '<text x="200" y="80" fill="white" font-size="24" text-anchor="middle" font-weight="bold" font-family="sans-serif">BuildProof</text>',
            '<text x="200" y="105" fill="#0052FF" font-size="14" text-anchor="middle" font-family="sans-serif">SHIP RECEIPT #', tokenId.toString(), '</text>',
            '<line x1="40" y1="130" x2="360" y2="130" stroke="#0052FF" stroke-width="1"/>',
            '<text x="60" y="165" fill="#888" font-size="12" font-family="sans-serif">PROJECT</text>',
            '<text x="60" y="185" fill="white" font-size="16" font-weight="bold" font-family="sans-serif">', _escapeSvg(r.projectName), '</text>',
            '<text x="60" y="225" fill="#888" font-size="12" font-family="sans-serif">CATEGORY</text>',
            '<text x="60" y="245" fill="white" font-size="14" font-family="sans-serif">', _escapeSvg(r.category), '</text>',
            '<text x="60" y="285" fill="#888" font-size="12" font-family="sans-serif">BUILDER SCORE</text>',
            '<text x="60" y="310" fill="#00D26A" font-size="28" font-weight="bold" font-family="sans-serif">', r.builderScore.toString(), '</text>',
            '<text x="200" y="285" fill="#888" font-size="12" font-family="sans-serif">AI SCORE</text>',
            '<text x="200" y="310" fill="#FFD700" font-size="28" font-weight="bold" font-family="sans-serif">', uint256(r.aiScore).toString(), '/100</text>',
            '<line x1="40" y1="340" x2="360" y2="340" stroke="#0052FF" stroke-width="1"/>',
            '<text x="200" y="370" fill="#888" font-size="11" text-anchor="middle" font-family="sans-serif">Built on Base</text>',
            '<circle cx="200" cy="400" r="20" fill="#0052FF"/>',
            '<text x="200" y="406" fill="white" font-size="14" text-anchor="middle" font-weight="bold" font-family="sans-serif">B</text>',
            '<text x="200" y="450" fill="#444" font-size="10" text-anchor="middle" font-family="sans-serif">', _escapeSvg(r.githubUrl), '</text>',
            '</svg>'
        ));
    }

    function _escapeJson(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory r = new bytes(b.length * 2);
        uint256 j;
        for (uint256 i; i < b.length; i++) {
            if (b[i] == '"') { r[j++] = '\\'; r[j++] = '"'; }
            else if (b[i] == '\\') { r[j++] = '\\'; r[j++] = '\\'; }
            else { r[j++] = b[i]; }
        }
        bytes memory t = new bytes(j);
        for (uint256 i; i < j; i++) t[i] = r[i];
        return string(t);
    }

    function _escapeSvg(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory r = new bytes(b.length * 6);
        uint256 j;
        for (uint256 i; i < b.length; i++) {
            if (b[i] == '<') { r[j++] = '&'; r[j++] = 'l'; r[j++] = 't'; r[j++] = ';'; }
            else if (b[i] == '>') { r[j++] = '&'; r[j++] = 'g'; r[j++] = 't'; r[j++] = ';'; }
            else if (b[i] == '&') { r[j++] = '&'; r[j++] = 'a'; r[j++] = 'm'; r[j++] = 'p'; r[j++] = ';'; }
            else if (b[i] == '"') { r[j++] = '&'; r[j++] = 'q'; r[j++] = 'u'; r[j++] = 'o'; r[j++] = 't'; r[j++] = ';'; }
            else { r[j++] = b[i]; }
        }
        bytes memory t = new bytes(j);
        for (uint256 i; i < j; i++) t[i] = r[i];
        return string(t);
    }

    function _updateTopBuilders(address builder) internal {
        uint256 score = builderShipCount[builder];
        for (uint256 i; i < LEADERBOARD_SIZE; i++) {
            if (topBuilders[i] == builder) {
                while (i > 0 && builderShipCount[topBuilders[i - 1]] < score) {
                    (topBuilders[i - 1], topBuilders[i]) = (topBuilders[i], topBuilders[i - 1]);
                    i--;
                }
                return;
            }
        }
        for (uint256 i; i < LEADERBOARD_SIZE; i++) {
            if (topBuilders[i] == address(0) || builderShipCount[topBuilders[i]] < score) {
                for (uint256 j = LEADERBOARD_SIZE - 1; j > i; j--) topBuilders[j] = topBuilders[j - 1];
                topBuilders[i] = builder;
                return;
            }
        }
    }

    function getLeaderboard(uint256 limit) external view returns (address[] memory b, uint256[] memory c) {
        uint256 len = limit < LEADERBOARD_SIZE ? limit : LEADERBOARD_SIZE;
        uint256 actual;
        for (uint256 i; i < len; i++) { if (topBuilders[i] == address(0)) break; actual++; }
        b = new address[](actual); c = new uint256[](actual);
        for (uint256 i; i < actual; i++) { b[i] = topBuilders[i]; c[i] = builderShipCount[topBuilders[i]]; }
    }

    function getAllBuilders() external view returns (address[] memory) { return allBuilders; }
    function getBuilderReceipts(address builder) external view returns (uint256[] memory) { return builderReceipts[builder]; }
    function totalShips() external view returns (uint256) { return _nextId; }

    function setSchemaUID(bytes32 uid) external onlyOwner { schemaUID = uid; emit SchemaUIDSet(uid); }
    function setAIVerifier(address v) external onlyOwner { require(v != address(0), "BP: zero address"); aiVerifier = v; emit AIVerifierSet(v); }
    function setMintCooldown(uint256 secs) external onlyOwner { mintCooldown = secs; emit MintCooldownSet(secs); }
    function setProtocolOwner(address newOwner) external onlyOwner { require(newOwner != address(0), "BP: zero address"); protocolOwner = newOwner; emit ProtocolOwnerSet(newOwner); }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
