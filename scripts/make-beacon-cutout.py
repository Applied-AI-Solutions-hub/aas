from pathlib import Path
import argparse
import os
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "beacon-grok-reveal.mp4"
WORK = ROOT / ".tmp" / "beacon-cutout"
FRAMES = WORK / "frames"
CUTOUTS = WORK / "cutouts"
OUT_WEBM = ROOT / "public" / "assets" / "beacon-grok-cutout.webm"
OUT_POSTER = ROOT / "public" / "assets" / "beacon-grok-cutout-poster.png"
OUT_PREVIEW = ROOT / "public" / "assets" / "beacon-grok-cutout-preview.mp4"


def configure_cuda_library_path() -> None:
    site_packages = ROOT / ".venv-media" / "lib" / "python3.12" / "site-packages"
    lib_dirs = sorted(site_packages.glob("nvidia/*/lib"))
    lib_dirs.append(Path("/usr/lib/wsl/lib"))
    existing = os.environ.get("LD_LIBRARY_PATH", "")
    parts = [str(path) for path in lib_dirs if path.exists()]
    if existing:
        parts.append(existing)
    os.environ["LD_LIBRARY_PATH"] = ":".join(parts)
    if parts and os.environ.get("AAS_CUDA_LIBRARY_PATH_READY") != "1":
        env = os.environ.copy()
        env["AAS_CUDA_LIBRARY_PATH_READY"] = "1"
        os.execvpe(sys.executable, [sys.executable, *sys.argv], env)


def run(command: list[str], *, allow_fail: bool = False) -> subprocess.CompletedProcess:
    print("$ " + " ".join(command), flush=True)
    result = subprocess.run(command, text=True)
    if result.returncode and not allow_fail:
        raise subprocess.CalledProcessError(result.returncode, command)
    return result


def has_nvidia_gpu() -> bool:
    smi = shutil.which("nvidia-smi") or "/usr/lib/wsl/lib/nvidia-smi"
    if not Path(smi).exists():
        return False
    return subprocess.run([smi], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0


def onnx_providers() -> list[str]:
    try:
        import onnxruntime as ort
    except ImportError:
        return []
    return list(ort.get_available_providers())


def extract_frames(source: Path, frames: Path, size: int, use_gpu: bool) -> None:
    if use_gpu:
        gpu_command = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-hwaccel",
            "cuda",
            "-hwaccel_output_format",
            "cuda",
            "-i",
            str(source),
            "-vf",
            f"scale_cuda={size}:-2,hwdownload,format=nv12",
            str(frames / "%04d.png"),
        ]
        result = run(gpu_command, allow_fail=True)
        if result.returncode == 0:
            return
        print("CUDA frame extraction failed; falling back to CPU ffmpeg.", file=sys.stderr)

    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-i",
            str(source),
            "-vf",
            f"scale={size}:-2",
            str(frames / "%04d.png"),
        ]
    )


def write_transparent_webm(cutouts: Path, output: Path, fps: int, crf: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-framerate",
            str(fps),
            "-i",
            str(cutouts / "%04d.png"),
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-auto-alt-ref",
            "0",
            "-b:v",
            "0",
            "-crf",
            str(crf),
            str(output),
        ]
    )


def write_nvenc_preview(cutouts: Path, output: Path, fps: int, frame_count: int, use_gpu: bool) -> None:
    if not use_gpu:
        return

    output.parent.mkdir(parents=True, exist_ok=True)
    duration = frame_count / fps
    result = run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-framerate",
            str(fps),
            "-i",
            str(cutouts / "%04d.png"),
            "-f",
            "lavfi",
            "-t",
            f"{duration:.3f}",
            "-i",
            f"color=c=0x050b12:s=720x1096:r={fps}",
            "-filter_complex",
            "[1:v][0:v]overlay=(W-w)/2:(H-h)/2:format=auto,format=yuv420p",
            "-c:v",
            "h264_nvenc",
            "-preset",
            "p5",
            "-cq",
            "21",
            "-frames:v",
            str(frame_count),
            "-movflags",
            "+faststart",
            str(output),
        ],
        allow_fail=True,
    )
    if result.returncode:
        print("NVENC preview failed; transparent WebM output is still usable.", file=sys.stderr)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the transparent Beacon mascot cutout.")
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--size", type=int, default=720, help="Output frame width before cutout.")
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--model", default="u2net", help="rembg model name.")
    parser.add_argument("--crf", type=int, default=28, help="VP9 alpha quality: lower is larger/better.")
    parser.add_argument("--output-webm", type=Path, default=OUT_WEBM)
    parser.add_argument("--output-poster", type=Path, default=OUT_POSTER)
    parser.add_argument("--output-preview", type=Path, default=OUT_PREVIEW)
    parser.add_argument("--cpu", action="store_true", help="Force CPU-only processing.")
    parser.add_argument("--alpha-matting", action="store_true", help="Use slower CPU-heavy alpha matting.")
    parser.add_argument("--skip-preview", action="store_true", help="Do not write the NVENC MP4 preview.")
    return parser.parse_args()


def main() -> int:
    configure_cuda_library_path()

    from PIL import Image
    from rembg import new_session, remove

    args = parse_args()
    source = args.source.resolve()
    output_webm = args.output_webm.resolve()
    output_poster = args.output_poster.resolve()
    output_preview = args.output_preview.resolve()

    if not source.exists():
        print(f"Missing source video: {source}", file=sys.stderr)
        return 1

    FRAMES.mkdir(parents=True, exist_ok=True)
    CUTOUTS.mkdir(parents=True, exist_ok=True)

    for stale in FRAMES.glob("*.png"):
        stale.unlink()
    for stale in CUTOUTS.glob("*.png"):
        stale.unlink()

    providers = onnx_providers()
    use_gpu = not args.cpu and has_nvidia_gpu()
    rembg_providers = ["CPUExecutionProvider"]

    if use_gpu and "CUDAExecutionProvider" in providers:
        rembg_providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]

    os.environ.setdefault("OMP_NUM_THREADS", str(max(1, (os.cpu_count() or 4) // 2)))
    print(f"NVIDIA GPU detected: {'yes' if use_gpu else 'no'}")
    print(f"ONNX providers: {providers or 'unavailable'}")
    print(f"rembg providers: {rembg_providers}")

    extract_frames(source, FRAMES, args.size, use_gpu)

    session = new_session(args.model, providers=rembg_providers)
    frame_paths = sorted(FRAMES.glob("*.png"))
    total = len(frame_paths)

    for index, frame_path in enumerate(frame_paths, start=1):
        image = Image.open(frame_path).convert("RGBA")
        cutout = remove(
            image,
            session=session,
            alpha_matting=args.alpha_matting,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )
        cutout.save(CUTOUTS / frame_path.name)
        if index == total:
            output_poster.parent.mkdir(parents=True, exist_ok=True)
            cutout.save(output_poster)
        if index % 12 == 0 or index == total:
            print(f"Processed {index}/{total} frames", flush=True)

    write_transparent_webm(CUTOUTS, output_webm, args.fps, args.crf)

    if not args.skip_preview:
        write_nvenc_preview(CUTOUTS, output_preview, args.fps, total, use_gpu)

    print(f"Wrote {output_webm}")
    print(f"Wrote {output_poster}")
    if output_preview.exists():
        print(f"Wrote {output_preview}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
