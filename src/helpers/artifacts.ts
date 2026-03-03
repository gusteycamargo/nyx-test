import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "e2e/artifacts";

const ARTIFACTS_ROOT = path.resolve(process.cwd(), ARTIFACTS_DIR);

export interface FlowArtifacts {
  runDir: string;
  screenshotsDir: string;
  videoPath: string;
  screenshot: (name: string) => string;
}

export function createArtifacts(name: string): FlowArtifacts {
  const timestamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const runDir = path.join(ARTIFACTS_ROOT, name, timestamp);

  const screenshotsDir = path.join(runDir, "screenshots");
  const videoDir = path.join(runDir, "video");
  const videoPath = path.join(videoDir, `${name}.webm`);

  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(videoDir, { recursive: true });

  return {
    runDir,
    screenshotsDir,
    videoPath,
    screenshot: (name: string) => path.join(screenshotsDir, name),
  };
}
