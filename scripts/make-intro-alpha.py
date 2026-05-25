from pathlib import Path
import argparse
import shutil
import subprocess

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".tmp" / "intro-alpha"


def run(command: list[str]) -> None:
    print("$ " + " ".join(command), flush=True)
    subprocess.run(command, check=True)


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    x = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def process_frame(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image).astype(np.float32)

    r = rgb[:, :, 0]
    g = rgb[:, :, 1]
    b = rgb[:, :, 2]
    intensity = np.max(rgb, axis=2)
    cyan_bias = np.clip((b - r + 18.0) / 86.0, 0.0, 1.0)
    cool_light = smoothstep(72.0, 178.0, intensity) * (0.55 + 0.45 * cyan_bias)

    # Keep the luminous logo and close halo, but drop the smoky dark plate.
    alpha = np.clip(cool_light * 255.0, 0.0, 255.0).astype(np.uint8)
    alpha[alpha < 45] = 0
    alpha_image = Image.fromarray(alpha, mode="L")
    alpha_image = alpha_image.filter(ImageFilter.GaussianBlur(radius=0.55))

    rgba = Image.merge("RGBA", (*image.split(), alpha_image))
    rgba.save(output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Key the AAS intro logo over alpha.")
    parser.add_argument("--source", type=Path, default=ROOT / "public/assets/aas-site-intro.mp4")
    parser.add_argument("--output-webm", type=Path, default=ROOT / "public/assets/aas-site-intro-transparent.webm")
    parser.add_argument("--output-poster", type=Path, default=ROOT / "public/assets/aas-site-intro-transparent-poster.png")
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--crf", type=int, default=18)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = args.source.resolve()
    output_webm = args.output_webm.resolve()
    output_poster = args.output_poster.resolve()

    if not source.exists():
      raise FileNotFoundError(source)

    frames = WORK / "frames"
    alpha_frames = WORK / "alpha"
    shutil.rmtree(WORK, ignore_errors=True)
    frames.mkdir(parents=True)
    alpha_frames.mkdir(parents=True)

    run([
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-i",
        str(source),
        "-vf",
        "scale=448:-2",
        str(frames / "%04d.png"),
    ])

    frame_paths = sorted(frames.glob("*.png"))
    for index, frame in enumerate(frame_paths, start=1):
        out = alpha_frames / frame.name
        process_frame(frame, out)
        if index == len(frame_paths):
            output_poster.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(out, output_poster)
        if index % 24 == 0 or index == len(frame_paths):
            print(f"Processed {index}/{len(frame_paths)} frames", flush=True)

    output_webm.parent.mkdir(parents=True, exist_ok=True)
    run([
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-framerate",
        str(args.fps),
        "-i",
        str(alpha_frames / "%04d.png"),
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-auto-alt-ref",
        "0",
        "-b:v",
        "0",
        "-crf",
        str(args.crf),
        str(output_webm),
    ])

    print(f"Wrote {output_webm}")
    print(f"Wrote {output_poster}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
