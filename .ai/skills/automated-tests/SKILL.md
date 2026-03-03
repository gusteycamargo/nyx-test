---
name: automated-tests
description: Generate deterministic, isolated, and maintainable end-to-end flow tests using nyx-test and agent-browser commands. Use when the user asks to create, update, or review e2e tests, browser flows, happy path coverage, sad path coverage, or edge case coverage.
---

# Automated Tests Generation

## Scope

This skill generates `*.flow.ts` tests for Vitest using `nyx-test`.

Goals: deterministic, isolated, readable, minimal, high-signal tests with behavior-driven naming.

---

## Core Principles

1. **Deterministic** — no flaky waits, no timing assumptions.
2. **Isolated** — no shared state, no execution-order dependency.
3. **One behavior per `it()`** — focused and atomic.
4. **Explicit assertions** — behavior-focused, never snapshot-only.
5. **No shared helpers** — each `it()` is self-contained.
6. **No `run("close")`** — the `it()` lifecycle handles session teardown automatically.
7. **Always ask for BASE_URL** — never assume, hardcode, or infer URLs.
8. **Prefer `find text "..."` for clickable elements** — use visible label over role/testid when stable and unique.
9. **Prefer `find placeholder "..."` for inputs** — inputs are not always linked to a label; placeholder is the most reliable locator.

---

## Before Generating Tests (Required)

### 1. Ask the user for BASE_URL

Never generate tests without a user-provided `BASE_URL`. No fallback, no localhost default.

### 2. Clarify unknowns

Ask if unclear:

- Authentication strategy
- Test data strategy (seeded? mocked? real DB?)
- Expected redirects or final states
- Feature flags
- Required preconditions
- External integrations

### 3. Discover implementation

1. Locate routes, controllers, validations, UI states, API calls.
2. Map: happy path, sad paths, edge cases, async states (loading, retry, timeout).
3. Present the scenario matrix to the user.
4. Get explicit scope confirmation before generating.

---

## nyx-test API

### `run(command, options?)`

Executes an `agent-browser` command inside the current test session.

```ts
function run(
  command: string,
  options?: { args?: string[]; silent?: boolean },
): string | void;
```

- Returns the command's stdout as a string (e.g., `run("get url")` returns the URL).
- Returns `void` for action commands (click, fill, open, etc.).
- With `silent: true`, swallows errors and returns `void` instead of throwing.

### `it(name, fn)`

Wraps Vitest's `it` with automatic browser session lifecycle. Each `it()`:

- Creates an isolated browser session (unique `sessionId`)
- Starts video recording automatically
- On completion (success or failure): stops recording + closes the browser

Supports all Vitest modifiers: `it.skip`, `it.only`, `it.each`, etc.

```ts
import { it } from "../helpers/it.js";
```

### `screenshot(name, options?)`

Captures a screenshot saved to the test's artifact directory.

```ts
function screenshot(
  name: string,
  options?: { silentErrors?: boolean },
): string | void;
```

- `name`: filename for the screenshot (e.g., `"01-login-page.png"`).
- `silentErrors: true`: prevents throwing on failure (use in catch blocks).

### `matchSnapshot()`

Takes an interactive snapshot (`snapshot -i`), normalizes it (strips refs, timestamps, UUIDs), and compares against Vitest's stored snapshot.

```ts
function matchSnapshot(): string;
```

- Returns the raw snapshot content.
- Throws if no snapshot content is available.

### `describe` (from Vitest)

Use `describe` from `vitest` for grouping. Keep `run`, `screenshot`, and `matchSnapshot` calls strictly inside `it()` blocks — session context only exists within `it()`.

---

## Command Quick Reference

Full reference: `./references/commands.md`

### Navigation

```
run(`open ${BASE_URL}/path`)
run("back")
run("reload")
```

### Waiting (determinism)

```
run('wait --url "**/dashboard"')        // wait for URL pattern
run('wait --text "Welcome"')            // wait for visible text
run('wait --load networkidle')          // wait for network idle
run('wait --fn "window.appReady"')      // wait for JS condition
```

### Finding & Interacting

```
run('find text "Submit" click')                      // button/link by visible text (preferred)
run('find placeholder "Email" fill "user@test.com"') // input by placeholder (preferred for inputs)
run('find label "Name" fill "John"')                 // input by label (fallback — not all inputs have labels)
run('find role button click --name "Save"')          // by role (fallback)
run('find testid "submit-btn" click')                // by test-id (last resort)
```

### Getting Information

```
const url = run("get url")
const title = run("get title")
const text = run("get text @e1")
const count = run("get count '.item'")
```

### Screenshots & Snapshots

```
screenshot("01-initial-state.png")
matchSnapshot()
```

### Keyboard

```
run("press Enter")
run("press Tab")
run("press Control+a")
```

---

## Locator Priority

**For clickable elements** (buttons, links, tabs, menu items):

1. **`find text "..."`** — preferred when the visible label is stable and unique.
2. **`find role <role> --name "..."`** — when no unique visible text exists.
3. **`find testid "..."`** — last resort.

**For inputs** (text fields, textareas, search boxes):

1. **`find placeholder "..."`** — **always prefer placeholder** for filling inputs. Not all inputs are linked to a `<label>`, but most have a placeholder. Example: `run('find placeholder "Email" fill "email@example.com"')`.
2. **`find label "..."`** — fallback only when the input has no placeholder but has an associated label.
3. **`find testid "..."`** — last resort.

---

## Wait Strategy

Never use arbitrary delays. Always tie waits to observable outcomes.

| Situation         | Strategy                        |
| ----------------- | ------------------------------- |
| Page navigation   | `wait --url "**/path"`          |
| Content appears   | `wait --text "Expected text"`   |
| Page fully loaded | `wait --load networkidle`       |
| JS condition      | `wait --fn "window.ready"`      |
| Element appears   | `wait @ref` (from snapshot ref) |

Combine when needed:

```ts
run('find text "Save" click');
run('wait --url "**/success"');
run('wait --text "Changes saved"');
```

---

## Test Structure

### Imports

```ts
import { run } from "../helpers/run.js";
import { expect } from "vitest";
import { it } from "../helpers/it.js";
import { screenshot } from "../helpers/screenshot.js";
import { matchSnapshot } from "../helpers/snapshot.js";
```

### Error handling

Every `it()` must wrap its body in try/catch with a failure screenshot:

```ts
it("does something", async () => {
  try {
    // test steps
  } catch (error) {
    screenshot("99-failure.png", { silentErrors: true });
    throw error;
  }
});
```

### Naming

Use concise, assertive, behavior-focused names. Never use "should".

| Bad                       | Good                                               |
| ------------------------- | -------------------------------------------------- |
| `it('should login')`      | `it('logs in with valid credentials')`             |
| `it('should show error')` | `it('shows validation error for empty email')`     |
| `it('should redirect')`   | `it('redirects to dashboard after login')`         |
| `it('should work')`       | `it('creates a new project with required fields')` |

---

## Examples

### Example 1 — Login flow (happy + sad paths)

```ts
import { run } from "../helpers/run.js";
import { expect, describe } from "vitest";
import { it } from "../helpers/it.js";
import { screenshot } from "../helpers/screenshot.js";
import { matchSnapshot } from "../helpers/snapshot.js";

const BASE_URL = "<ASK_USER>";

describe("Login", () => {
  it("logs in with valid credentials and redirects to dashboard", async () => {
    try {
      run(`open ${BASE_URL}/login`);
      run('wait --url "**/login"');
      screenshot("01-login-page.png");

      run('find placeholder "Email" fill "admin@company.com"');
      run('find placeholder "Password" fill "securepass123"');
      screenshot("02-filled-form.png");

      run('find text "Sign in" click');
      run('wait --url "**/dashboard"');
      screenshot("03-dashboard.png");

      const url = run("get url");
      expect(url).toContain("/dashboard");
      matchSnapshot();
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });

  it("shows error for invalid credentials", async () => {
    try {
      run(`open ${BASE_URL}/login`);
      run('wait --url "**/login"');

      run('find placeholder "Email" fill "wrong@email.com"');
      run('find placeholder "Password" fill "wrongpass"');
      run('find text "Sign in" click');

      run('wait --text "Invalid email or password"');
      screenshot("01-error-message.png");

      const url = run("get url");
      expect(url).toContain("/login");
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });

  it("shows validation errors for empty fields", async () => {
    try {
      run(`open ${BASE_URL}/login`);
      run('wait --url "**/login"');

      run('find text "Sign in" click');

      run('wait --text "Email is required"');
      screenshot("01-validation-errors.png");
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });
});
```

### Example 2 — CRUD flow (create + verify + delete)

```ts
import { run } from "../helpers/run.js";
import { expect, describe } from "vitest";
import { it } from "../helpers/it.js";
import { screenshot } from "../helpers/screenshot.js";

const BASE_URL = "<ASK_USER>";

describe("Projects", () => {
  it("creates a new project with required fields", async () => {
    try {
      run(`open ${BASE_URL}/projects`);
      run('wait --url "**/projects"');
      screenshot("01-projects-list.png");

      run('find text "New Project" click');
      run('wait --url "**/projects/new"');

      run('find placeholder "Project name" fill "E2E Test Project"');
      run('find placeholder "Description" fill "Created by automated test"');
      run('find text "Create" click');

      run('wait --text "Project created successfully"');
      screenshot("02-project-created.png");

      run('wait --url "**/projects/**"');
      const url = run("get url");
      expect(url).toMatch(/\/projects\/[\w-]+/);
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });

  it("shows validation error when creating project without name", async () => {
    try {
      run(`open ${BASE_URL}/projects/new`);
      run('wait --url "**/projects/new"');

      run('find text "Create" click');

      run('wait --text "Name is required"');
      screenshot("01-validation-error.png");

      const url = run("get url");
      expect(url).toContain("/projects/new");
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });

  it("deletes a project and removes it from the list", async () => {
    try {
      run(`open ${BASE_URL}/projects`);
      run('wait --url "**/projects"');

      run('find text "E2E Test Project" click');
      run('wait --url "**/projects/**"');
      screenshot("01-project-detail.png");

      run('find text "Delete" click');
      run('wait --text "Are you sure"');
      screenshot("02-confirmation-dialog.png");

      run('find text "Confirm" click');
      run('wait --url "**/projects"');
      run('wait --text "Project deleted"');
      screenshot("03-project-deleted.png");
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });
});
```

### Example 3 — Multi-step form with navigation

```ts
import { run } from "../helpers/run.js";
import { expect } from "vitest";
import { it } from "../helpers/it.js";
import { screenshot } from "../helpers/screenshot.js";
import { matchSnapshot } from "../helpers/snapshot.js";

const BASE_URL = "<ASK_USER>";

it("completes a multi-step registration form", async () => {
  try {
    run(`open ${BASE_URL}/register`);
    run('wait --url "**/register"');

    // Step 1 — Personal info
    run('find placeholder "Full name" fill "Jane Doe"');
    run('find placeholder "Email" fill "jane@example.com"');
    run('find text "Next" click');
    run('wait --text "Company Information"');
    screenshot("01-step1-complete.png");

    // Step 2 — Company info
    run('find placeholder "Company name" fill "Acme Corp"');
    run('find placeholder "Industry" fill "Technology"');
    run('find text "Next" click');
    run('wait --text "Review"');
    screenshot("02-step2-complete.png");

    // Step 3 — Review and submit
    matchSnapshot();
    run('find text "Submit" click');
    run('wait --url "**/welcome"');
    screenshot("03-registration-complete.png");

    const url = run("get url");
    expect(url).toContain("/welcome");
  } catch (error) {
    screenshot("99-failure.png", { silentErrors: true });
    throw error;
  }
});
```

### Example 4 — Table interaction and data verification

```ts
import { run } from "../helpers/run.js";
import { expect, describe } from "vitest";
import { it } from "../helpers/it.js";
import { screenshot } from "../helpers/screenshot.js";

const BASE_URL = "<ASK_USER>";

describe("Users table", () => {
  it("filters users by search term", async () => {
    try {
      run(`open ${BASE_URL}/admin/users`);
      run('wait --url "**/admin/users"');

      run('find placeholder "Search users" fill "jane"');
      run("press Enter");
      run('wait --text "jane@example.com"');
      screenshot("01-filtered-results.png");

      const count = run("get count 'tbody tr'");
      expect(Number(count)).toBeGreaterThan(0);
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });

  it("sorts users by name column", async () => {
    try {
      run(`open ${BASE_URL}/admin/users`);
      run('wait --url "**/admin/users"');
      screenshot("01-initial-order.png");

      run('find text "Name" click');
      run("wait --load networkidle");
      screenshot("02-sorted-by-name.png");

      const snapshot = run("snapshot -i");
      expect(snapshot).toBeDefined();
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });

  it("paginates to the next page", async () => {
    try {
      run(`open ${BASE_URL}/admin/users`);
      run('wait --url "**/admin/users"');

      run('find text "Next" click');
      run('wait --url "**/users?page=2"');
      screenshot("01-page-2.png");

      const url = run("get url");
      expect(url).toContain("page=2");
    } catch (error) {
      screenshot("99-failure.png", { silentErrors: true });
      throw error;
    }
  });
});
```

### Example 5 — Dropdown, checkbox, and select interactions

```ts
import { run } from "../helpers/run.js";
import { expect } from "vitest";
import { it } from "../helpers/it.js";
import { screenshot } from "../helpers/screenshot.js";

const BASE_URL = "<ASK_USER>";

it("submits settings form with select and checkbox", async () => {
  try {
    run(`open ${BASE_URL}/settings`);
    run('wait --url "**/settings"');

    run('find placeholder "Language" fill "Portuguese"');
    run('find placeholder "Timezone" fill "America/Sao_Paulo"');
    run('find text "Enable notifications" click');
    screenshot("01-settings-filled.png");

    run('find text "Save changes" click');
    run('wait --text "Settings updated"');
    screenshot("02-settings-saved.png");
  } catch (error) {
    screenshot("99-failure.png", { silentErrors: true });
    throw error;
  }
});
```

### Example 6 — Network mocking for error states

```ts
import { run } from "../helpers/run.js";
import { it } from "../helpers/it.js";
import { screenshot } from "../helpers/screenshot.js";

const BASE_URL = "<ASK_USER>";

it("displays error state when API fails", async () => {
  try {
    run(`open ${BASE_URL}/dashboard`);
    run('wait --url "**/dashboard"');

    run("network route **/api/stats --abort");

    run("reload");
    run('wait --text "Something went wrong"');
    screenshot("01-error-state.png");

    run("network unroute");
  } catch (error) {
    screenshot("99-failure.png", { silentErrors: true });
    throw error;
  }
});
```

---

## Isolation Rules

Each `it()` must:

- Start from a clean navigation (`run(\`open ...\`)`)
- Not depend on previous test results or execution order
- Not call `run("close")` — the lifecycle handles this

If a test mutates state, subsequent tests must navigate fresh or reset via UI.

---

## Reuse Anti-Pattern (Forbidden)

Do not create:

- Shared helper functions across test files
- Action abstractions (e.g., `loginAs(user)`, `fillForm(data)`)
- Cross-test utility modules

Each `it()` must be self-contained. Small local duplication is acceptable for clarity and independence. If setup is needed, keep it in `beforeAll`/`afterAll` without action abstractions.

---

## Coverage Matrix

When generating test suites, cover:

| Category         | Examples                                                      |
| ---------------- | ------------------------------------------------------------- |
| **Happy path**   | Primary successful flow end-to-end                            |
| **Sad paths**    | Invalid input, auth failure, forbidden access, backend errors |
| **Edge cases**   | Empty fields, boundary values, double submit, expired session |
| **Async states** | Loading indicators, retry behavior, timeout handling          |

Only include scenarios that add meaningful signal. No redundant tests.

---

## Anti-Patterns (Never Generate)

- Tests depending on execution order
- Asserting implementation details instead of behavior
- Snapshot-only tests without explicit assertions
- Arbitrary time delays (`wait 5000`)
- Multiple unrelated behaviors in one `it()`
- Shared helper functions across tests
- Hardcoded or inferred `BASE_URL`
- Using role/testid when stable visible text is available for clickable elements
- Using `find label` for inputs when placeholder is available
- Calling `run("close")` anywhere

---

## File Naming

Pattern: `feature-name.flow.ts`

Examples: `auth-login.flow.ts`, `checkout-payment.flow.ts`, `user-profile-update.flow.ts`, `admin-users.flow.ts`
