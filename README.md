# Nyx Test

Nyx Test is a TypeScript toolkit for browser-flow testing with `agent-browser` and `vitest`, plus a small CLI to distribute reusable AI skills across projects.

## What it includes

- Test helpers for end-to-end style flows:
  - `it()` wrapper with per-test session/artifact lifecycle
  - `run()` helper to execute `agent-browser` commands
  - `screenshot()` helper for saved screenshots
  - `matchSnapshot()` helper for normalized snapshot assertions
- Artifact generation under `e2e/artifacts` (configurable)
- CLI command to copy packaged skills into another project

## Installation

```bash
yarn add nyx-test
```

Nyx Test uses:

- `agent-browser`
- `vitest`

They are declared as peer dependencies, so make sure they are available in your project.

## Library usage

Import helpers from the package entrypoint:

```ts
import { it, run, screenshot, matchSnapshot } from "nyx";
```

`it` keeps Nyx's artifact/session lifecycle and supports the same chainable API style as Vitest, like `it.skip`, `it.only`, `it.each`, `it.skipIf`, and `it.runIf`.

Example:

```ts
import { describe } from "vitest";
import { it, run, screenshot, matchSnapshot } from "nyx";

describe("checkout flow", () => {
  it("completes purchase", async () => {
    run("goto https://example.com");
    run("click 'Buy now'");
    screenshot("after-buy.png");
    matchSnapshot();
  });
});
```

## CLI usage

Nyx Test exposes a binary named `nyx-test`.

### `copy-skills`

Copies skill folders from `.ai/skills` in the current working directory to a target path.

```bash
npx nyx-test copy-skills --skills-path ./skills
```

Options:

- `--skills-path <skills-path>`: destination path (default: `./skills`)

During copy, Nyx Test updates each copied `SKILL.md` by replacing `<PATH>` placeholders with the provided path.

## Artifacts

By default, test artifacts are written to:

```txt
e2e/artifacts/<test-file>/<timestamp-uuid>/
```

Inside each run directory:

- `screenshots/`
- `video/<test-file>.webm`

You can override the root directory with:

```bash
E2E_ARTIFACTS_DIR=custom/path
```

## Development

Install dependencies:

```bash
yarn install
```

Available scripts:

- `yarn build` - compile TypeScript to `dist`
- `yarn test` - run tests with Vitest
- `yarn test:watch` - run tests in watch mode

## License

MIT
