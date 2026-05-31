# Applied AI Solutions Website

Public Astro build for `appliedai.solutions`.

## Public Links

- Website: https://appliedai.solutions/
- Beacon: https://appliedai.solutions/beacon/
- Projects: https://appliedai.solutions/projects/
- Contact: info@appliedai.solutions

The site presents Applied AI Solutions around:

- Applied AI Solutions as the main brand
- Beacon as the local-first companion/product surface
- practical business AI workflows
- office/document ingestion
- approval-based automation
- clear privacy boundaries

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run media:setup
npm run media:beacon-cutout
```

## Stack

- Astro 6
- Static output
- System-font CSS
- Canonical Applied AI logo assets
- Beacon hoodie mascot asset
- Three.js Beacon hero stage with Blender GLB handoff
- Cloudflare Worker intake endpoint at `/api/intake`

## Intake Form

The public contact sections submit to the Worker endpoint at `/api/intake`
instead of relying on a visitor's mail app. The Worker expects a Cloudflare KV
binding named `LEADS`.

Before deploying intake publicly:

```bash
npx wrangler kv namespace create LEADS
```

Then add the returned production namespace id to `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "LEADS", "id": "production_namespace_id" }
]
```

Optional email notification uses Resend:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put NOTIFY_EMAIL
npx wrangler secret put RESEND_FROM
```

KV capture is the source of truth; email notification is only a convenience.

## Beacon Media Pipeline

`npm run media:setup` creates `.venv-media` with Python 3.12, `rembg[gpu]`, and
Pillow. This keeps GPU media dependencies out of the system Python.

`npm run media:beacon-cutout` rebuilds the transparent Beacon mascot:

- Uses CUDA frame decode/scale when WSL can see the NVIDIA GPU.
- Uses ONNX Runtime CUDA for `rembg` when available.
- Writes the browser-facing transparent WebM alpha video.
- Writes a poster PNG.
- Writes an NVENC H.264 MP4 preview for fast local review.

Transparent browser video still uses VP9/WebM alpha because MP4 does not provide
reliable browser transparency.

Use `npm run media:beacon-cutout -- --alpha-matting` only when edge refinement
matters more than speed. Alpha matting is CPU-heavy even with GPU inference.

## Beacon 3D Pipeline

The Beacon page now mounts a Three.js hero stage. It tries to load:

```text
public/models/beacon-rig.glb
```

If the GLB is missing, the site uses a procedural Three.js Beacon stand-in so
the interaction and animation system can be developed immediately.

Blender handoff files:

- `public/models/README.md`
- `scripts/blender/README.md`
- `scripts/blender/create-beacon-rig.py`

When Blender is available:

```bash
blender --background --python scripts/blender/create-beacon-rig.py
```

## Notes

The build outputs to `dist/`. The current design uses no external runtime scripts and no client-side framework.

Previous contents were preserved before reset in:

- branch: `backup/pre-reset-20260524-002932`
- tag: `pre-reset-20260524-002932`
