import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
const assets = {};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) scan(f);
    else {
      const url =
        "/" + path.relative("dist/client", f).split(path.sep).join("/");
      assets[url] = {
        mime: mime[path.extname(f)] || "application/octet-stream",
        body: fs.readFileSync(f).toString("base64"),
      };
    }
  }
}
scan("dist/client");
fs.mkdirSync("dist/server", { recursive: true });
fs.writeFileSync("data/assets.generated.json", JSON.stringify(assets));
await build({
  entryPoints: ["server/worker.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
  minify: true,
  external: ["cloudflare:workers"],
});
fs.rmSync("data/assets.generated.json");
console.log(
  "Built self-contained Worker with",
  Object.keys(assets).length,
  "static assets.",
);
