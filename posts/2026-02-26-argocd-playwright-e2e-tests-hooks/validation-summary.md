# Validation Summary: How to Use Playwright E2E Tests with ArgoCD Hooks

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD hooks, sync phases, and sync waves
- Kubernetes Jobs, init containers, resources, and ConfigMaps
- Playwright Test, Playwright Docker images, reporters, assertions, and APIRequestContext
- Docker
- Shell scripting
- Slack incoming webhooks
- S3 presigned uploads

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Playwright Docker documentation: https://playwright.dev/docs/docker
- Playwright Test configuration documentation: https://playwright.dev/docs/test-configuration
- Playwright reporters documentation: https://playwright.dev/docs/test-reporters
- Playwright API testing documentation: https://playwright.dev/docs/api-testing
- Playwright LocatorAssertions API documentation: https://playwright.dev/docs/api/class-locatorassertions
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The Dockerfile used `mcr.microsoft.com/playwright:v1.41.0-jammy`, which is outdated for this validation date. Updated it to `mcr.microsoft.com/playwright:v1.60.0-noble`, matching the current Playwright Docker documentation, and added a note that `@playwright/test` in `package-lock.json` should match the Docker image version because the image includes browsers and system dependencies but not the Playwright package itself.
- The Kubernetes Job command passed `--reporter=list`, which would override the `playwright.config.ts` reporter array and prevent the configured JUnit output at `/tmp/results/junit.xml` from being generated. Removed the reporter override from the Job and artifact examples so the Playwright config is honored.
- The homepage smoke test registered `page.on('console')` after `page.goto('/')` and initial assertions, so JavaScript console errors during navigation could be missed. Moved the console listener before navigation.
- The Slack notification snippet interpolated raw `grep` output into a JSON string, which can produce invalid JSON when failures contain quotes, backslashes, or newlines. Replaced the inline JSON string with a small Node script that writes a JSON-encoded Slack payload safely.

## Review Notes
- Argo CD `PostSync`, `argocd.argoproj.io/sync-wave`, and `argocd.argoproj.io/hook-delete-policy` usage aligns with the official Argo CD hook and sync wave documentation.
- The Kubernetes Job fields `backoffLimit`, `activeDeadlineSeconds`, and `restartPolicy: Never` are valid for this use case.
- Playwright APIs used in the examples, including `defineConfig`, `devices`, `page.route`, response listeners, locator assertions, and the `request` fixture, are current and documented.
- `page.waitForLoadState('networkidle')` is available, but Playwright generally recommends web-first assertions for readiness checks when possible.
