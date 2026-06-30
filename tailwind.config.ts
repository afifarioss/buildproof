import type { Config } from "tailwindcss";
export default {
  content:["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"],
  theme:{ extend:{ colors:{ base:{blue:"#0052FF",light:"#60A5FA",dark:"#0039B3"} }, fontFamily:{ mono:["'JetBrains Mono'","ui-monospace","monospace"] } } },
  plugins:[],
} satisfies Config;