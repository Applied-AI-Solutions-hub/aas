import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DIST = path.join(ROOT, "dist");

function argValue(name, fallback = undefined) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const page = argValue("--page", "index.html").replace(/^\/+/, "");
const out = path.resolve(argValue("--out", path.join(ROOT, "artifacts", "portable-preview.html")));
const maxInlineBytes = Number(argValue("--max-inline-bytes", "6000000"));

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  return "application/octet-stream";
}

function inlineFile(file) {
  const stat = fs.statSync(file);
  if (stat.size > maxInlineBytes || /\.(mp4|webm)$/i.test(file)) return null;
  return `data:${mimeFor(file)};base64,${fs.readFileSync(file).toString("base64")}`;
}

function inlineJsModule(file, seen = new Set()) {
  const resolved = path.resolve(file);
  if (seen.has(resolved)) return "";
  seen.add(resolved);

  let source = fs.readFileSync(resolved, "utf8");
  source = source.replace(/import\s*["'](\.\/[^"']+\.js)["'];?/g, (match, src) => {
    const imported = path.resolve(path.dirname(resolved), src);
    if (!fs.existsSync(imported)) return match;
    return inlineJsModule(imported, seen);
  });

  return source;
}

let html = fs.readFileSync(path.join(DIST, page), "utf8");

html = html.replace(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (match, src) => {
  const file = path.join(DIST, src.replace(/^\/+/, ""));
  if (!fs.existsSync(file)) return "";
  return `<script type="module">\n${inlineJsModule(file)}\n</script>`;
});

html = html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g, (match, href) => {
  const file = path.join(DIST, href.replace(/^\/+/, ""));
  if (!fs.existsSync(file)) return match;
  return `<style>\n${fs.readFileSync(file, "utf8")}\n</style>`;
});

html = html.replace(/(src|poster)="(\/assets\/[^"]+)"/g, (match, attr, src) => {
  const file = path.join(DIST, src.replace(/^\/+/, ""));
  if (!fs.existsSync(file)) return match;
  const dataUrl = inlineFile(file);
  if (!dataUrl) return `${attr}="" data-original-src="${src}"`;
  return `${attr}="${dataUrl}"`;
});

html = html.replace(
  "</head>",
  `<style>
.preview-note{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:rgba(2,4,7,.92);border:1px solid rgba(255,255,255,.18);color:#f7fbff;padding:10px 12px;border-radius:8px;font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.preview-note strong{color:#35e7ff}
@media (min-width:720px){.preview-note{left:auto;right:18px;max-width:420px}}
</style>
</head>`,
);
html = html.replace(
  "</body>",
  `<div class="preview-note"><strong>Portable preview:</strong> embedded CSS and key images for phone review. Video files are omitted to keep the attachment usable.</div>\n</body>`,
);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

const unresolved = html.match(/\s(?:src|href|poster)="\/assets\//g) || [];
const unresolvedImports = html.match(/import\s*["']\.\/[^"']+["'];?/g) || [];
console.log(`Portable preview written to ${out}`);
console.log(`${Math.round(fs.statSync(out).size / 1024)} KB`);
console.log(`Unresolved asset refs: ${unresolved.length}`);
console.log(`Unresolved local imports: ${unresolvedImports.length}`);
if (unresolved.length || unresolvedImports.length) process.exitCode = 1;
