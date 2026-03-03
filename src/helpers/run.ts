import { execFileSync } from "node:child_process";
import { getTestSessionId } from "./it.js";

interface RunOptions {
  args?: string[];
  silent?: boolean;
}

export function run(
  rawCommand: string,
  options: RunOptions = {},
): string | void {
  const sessionId = getTestSessionId();
  let command = `yarn run agent-browser --session ${sessionId} ${rawCommand}`;

  if (options.args) command += ` ${options.args.join(" ")}`;

  try {
    return execFileSync(command, {
      stdio: "pipe",
      timeout: 30000,
      shell: true,
    }).toString();
  } catch (error) {
    if (options.silent) return;

    throw new Error(`Command failed: ${command}`, { cause: error });
  }
}
