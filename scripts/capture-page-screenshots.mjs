import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DEFAULT_OUT = path.join(ROOT, "artifacts", "visual-review");

function argValue(name, fallback = undefined) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function findBrowser() {
  if (process.env.BROWSER_EXECUTABLE && fs.existsSync(process.env.BROWSER_EXECUTABLE)) {
    return process.env.BROWSER_EXECUTABLE;
  }

  const cacheRoot = path.join(process.env.HOME || "", ".cache", "aas-browsers", "chrome-headless-shell");
  if (!fs.existsSync(cacheRoot)) return null;

  const candidates = fs
    .readdirSync(cacheRoot)
    .sort()
    .reverse()
    .map((version) =>
      path.join(cacheRoot, version, "chrome-headless-shell-linux64", "chrome-headless-shell"),
    )
    .filter((candidate) => fs.existsSync(candidate));

  return candidates[0] || null;
}

const url = argValue("--url", "http://127.0.0.1:4324/");
const outDir = path.resolve(argValue("--out", DEFAULT_OUT));
const browserPath = findBrowser();

if (!browserPath) {
  console.error("No browser executable found. Run:");
  console.error("npx @puppeteer/browsers install chrome-headless-shell@stable --path ~/.cache/aas-browsers");
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
  { name: "tablet", width: 820, height: 1180, deviceScaleFactor: 1, isMobile: true },
  { name: "desktop", width: 1440, height: 1000, deviceScaleFactor: 1, isMobile: false },
];

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: "shell",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const report = {
  url,
  browserPath,
  generatedAt: new Date().toISOString(),
  screenshots: [],
  findings: [],
};

try {
  for (const viewport of viewports) {
    const page = await browser.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("requestfailed", (request) => {
      failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "failed" });
    });

    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const screenshotPath = path.join(outDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const audit = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      const overflow = [...document.querySelectorAll("body *")]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            className: typeof el.className === "string" ? el.className : "",
            text: (el.textContent || "").trim().slice(0, 90),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((item) => item.width > 0 && (item.left < -2 || item.right > width + 2))
        .slice(0, 20);

      const tinyTargets = [...document.querySelectorAll("a, button, input, select, textarea")]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 90),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((item) => item.width > 0 && item.height > 0 && (item.width < 40 || item.height < 40))
        .slice(0, 20);

      const brokenImages = [...document.images]
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
        .slice(0, 20);

      return {
        title: document.title,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: width,
        viewportHeight: height,
        documentHeight: document.documentElement.scrollHeight,
        overflow,
        tinyTargets,
        brokenImages,
      };
    });

    report.screenshots.push({ viewport: viewport.name, path: screenshotPath, audit });

    if (audit.scrollWidth > audit.clientWidth + 2 || audit.overflow.length) {
      report.findings.push({
        severity: "warn",
        viewport: viewport.name,
        message: "Horizontal overflow detected.",
        evidence: audit.overflow,
      });
    }
    if (audit.tinyTargets.length) {
      report.findings.push({
        severity: "warn",
        viewport: viewport.name,
        message: "Small touch/click targets detected.",
        evidence: audit.tinyTargets,
      });
    }
    if (audit.brokenImages.length) {
      report.findings.push({
        severity: "fail",
        viewport: viewport.name,
        message: "Broken images detected.",
        evidence: audit.brokenImages,
      });
    }
    if (consoleErrors.length) {
      report.findings.push({
        severity: "warn",
        viewport: viewport.name,
        message: "Console errors detected.",
        evidence: consoleErrors.slice(0, 20),
      });
    }
    if (failedRequests.length) {
      report.findings.push({
        severity: "warn",
        viewport: viewport.name,
        message: "Network request failures detected.",
        evidence: failedRequests.slice(0, 20),
      });
    }

    await page.close();
  }
} finally {
  await browser.close();
}

const reportPath = path.join(outDir, "visual-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Visual review written to ${outDir}`);
console.log(`Report: ${reportPath}`);
if (report.findings.length) {
  console.log(`Findings: ${report.findings.length}`);
  process.exitCode = 1;
} else {
  console.log("Findings: 0");
}
