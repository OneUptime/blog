# Validation Summary: How to End-to-End Test Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Multi-App Run, state store components, sidecars)
- Node.js / Jest (E2E test framework)
- Redis (state store backend)
- GitHub Actions (CI workflow)
- axios (HTTP client for tests)

## Sources Consulted
- Dapr Multi-App Run template docs: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr CLI install docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr CLI `run` command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `stop` command reference: https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr CLI GitHub repo: https://github.com/dapr/cli

## Issues Found

1. **Incorrect `wget` command for Dapr CLI installation in CI workflow**
   - **What was wrong:** The command `wget -q URL | /bin/bash` does not pipe the downloaded script to bash. Without the `-O -` flag, `wget` saves the file to disk and its stdout is empty, so nothing is piped to `/bin/bash`.
   - **What was changed:** Added `-O -` flag: `wget -q URL -O - | /bin/bash`.
   - **Why:** Without this fix, the Dapr CLI would not be installed in the CI environment, causing all subsequent steps to fail.

2. **Missing Node.js setup and dependency installation in CI workflow**
   - **What was wrong:** The workflow runs `npm test` but never sets up Node.js or installs npm dependencies. The `ubuntu-latest` runner has Node.js pre-installed but relying on the default version is fragile, and `npm install` is required before tests can run.
   - **What was changed:** Added `actions/setup-node@v4` with `node-version: 20` and an `npm install` step before the Dapr CLI installation.
   - **Why:** Without these steps, `npm test` would fail due to missing dependencies (e.g., axios, jest).

## Review Notes
- The `sleep 10` wait strategy in CI is fragile; a health-check polling loop would be more robust. However, this is acceptable for a tutorial-level example.
- The Jest tests rely on ordered execution of `it()` blocks (the second test depends on the first having placed an order). Jest runs tests within a `describe` block sequentially by default, so this works, but it's worth noting as a pattern that can be surprising.
- The teardown `afterAll` block references `orderId` but is shown outside the `describe` block in the post. In practice, it would need to be inside the same `describe` to access the `orderId` variable. This is likely just a presentation choice to separate concerns in the blog post.
