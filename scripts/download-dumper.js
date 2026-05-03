#!/usr/bin/env node
/**
 * download-dumper.js
 *
 * Downloads the `dumper-linux` binary before the Next.js build runs.
 *
 * Configuration (via environment variables):
 *   DUMPER_BINARY_URL  – Direct download URL for the compiled Linux x86_64
 *                        dumper binary.  Set this in your Railway (or other
 *                        host) environment variables to point at your actual
 *                        release asset, e.g.:
 *
 *                        https://github.com/<owner>/<repo>/releases/download/<tag>/dumper-linux
 *
 * If DUMPER_BINARY_URL is not set the script writes a shell-script stub so
 * that the Next.js build succeeds and the API returns a human-readable error
 * instead of crashing with ENOENT.
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const BINARY_NAME = "dumper-linux";
const DEST = path.join(__dirname, "..", BINARY_NAME);

// ── helpers ──────────────────────────────────────────────────────────────────

function writeStub() {
  const stub = `#!/bin/sh
echo "ERROR: dumper-linux is a stub. Set DUMPER_BINARY_URL and redeploy." >&2
exit 1
`;
  fs.writeFileSync(DEST, stub, { mode: 0o755 });
  console.warn(
    "[download-dumper] WARNING: DUMPER_BINARY_URL is not set.\n" +
      "  A stub binary has been written to the project root.\n" +
      "  The /api/dump endpoint will return an error until a real binary is provided.\n" +
      "  Set DUMPER_BINARY_URL to the download URL of your compiled dumper-linux binary."
  );
}

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects === 0) {
      return reject(new Error("Too many redirects"));
    }

    const client = url.startsWith("https://") ? https : http;

    client
      .get(url, (res) => {
        // Follow redirects (GitHub releases use them heavily)
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return resolve(download(res.headers.location, dest, redirects - 1));
        }

        if (res.statusCode !== 200) {
          return reject(
            new Error(`Download failed – HTTP ${res.statusCode} for ${url}`)
          );
        }

        const file = fs.createWriteStream(dest, { mode: 0o755 });
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      })
      .on("error", reject);
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Skip if the binary is already present (e.g. committed to the repo or a
  // previous run already downloaded it).
  if (fs.existsSync(DEST)) {
    console.log(`[download-dumper] ${BINARY_NAME} already exists – skipping download.`);
    return;
  }

  const url = process.env.DUMPER_BINARY_URL;

  if (!url) {
    writeStub();
    return;
  }

  console.log(`[download-dumper] Downloading ${BINARY_NAME} from:\n  ${url}`);

  try {
    await download(url, DEST);
    fs.chmodSync(DEST, 0o755);
    console.log(`[download-dumper] ✓ ${BINARY_NAME} downloaded and marked executable.`);
  } catch (err) {
    console.error(`[download-dumper] Download failed: ${err.message}`);
    console.warn("[download-dumper] Falling back to stub binary.");
    writeStub();
  }
}

main().catch((err) => {
  console.error("[download-dumper] Unexpected error:", err);
  process.exit(1);
});
