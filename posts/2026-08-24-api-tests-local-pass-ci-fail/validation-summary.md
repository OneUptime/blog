# Validation Summary: Why Do API Tests Pass Locally but Fail in CI? Debugging URLs, Secrets, Clocks, and Shared State

## Status

validated

## Post Type

Troubleshooting Guide / Tutorial

## Technologies Covered

- Playwright Test and `APIRequestContext`
- TypeScript and Node.js
- GitHub Actions, hosted runners, secrets, variables, reusable workflows, and service containers
- HTTP/HTTPS URL resolution, DNS, TLS, and authorization status codes
- ISO 8601-style timestamps, JavaScript `Date`, `Intl`, and time-zone configuration
- Parallel workers, retries, sharding, external test-state isolation, and fixture ownership
- Playwright traces, CI artifacts, log redaction, and secure diagnostics
- Docker/OCI image digests and reproducible CI environments

## Sources Consulted

- GitHub-hosted runners reference — https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- GitHub Actions service-container networking — https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers
- GitHub Actions secrets documentation — https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub Actions reusable workflows — https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Actions variables and contexts references — https://docs.github.com/en/actions/reference/workflows-and-actions/variables and https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub guidance for securely using `pull_request_target` — https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target
- Playwright API testing, `APIRequest`, `APIRequestContext`, and `APIResponse` — https://playwright.dev/docs/api-testing, https://playwright.dev/docs/api/class-apirequest, https://playwright.dev/docs/api/class-apirequestcontext, and https://playwright.dev/docs/api/class-apiresponse
- Playwright test configuration, `baseURL`, trace modes, retries, flaky-test policy, and web-server configuration — https://playwright.dev/docs/test-configuration, https://playwright.dev/docs/api/class-testoptions, https://playwright.dev/docs/test-retries, https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests, https://playwright.dev/docs/release-notes#version-143, and https://playwright.dev/docs/test-webserver
- Playwright parallelism, `TestInfo`, and `TestCase` — https://playwright.dev/docs/test-parallel, https://playwright.dev/docs/api/class-testinfo, and https://playwright.dev/docs/api/class-testcase
- Playwright command-line and Trace Viewer references — https://playwright.dev/docs/test-cli and https://playwright.dev/docs/trace-viewer
- WHATWG URL Standard and MDN `URL()` constructor reference — https://url.spec.whatwg.org/ and https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
- ECMAScript `Date.parse`, ECMA-402 `Intl.DateTimeFormat.resolvedOptions`, and MDN date references — https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.parse, https://tc39.es/ecma402/#sec-intl.datetimeformat.prototype.resolvedoptions, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse, and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
- Node.js `crypto.randomUUID()` and `TZ` documentation — https://nodejs.org/api/crypto.html#cryptorandomuuidoptions and https://nodejs.org/api/cli.html#tz
- RFC 3339 timestamp grammar and RFC 9110 HTTP semantics — https://www.rfc-editor.org/rfc/rfc3339.html and https://www.rfc-editor.org/rfc/rfc9110.html
- Docker image-digest documentation — https://docs.docker.com/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier
- OWASP Logging Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Issues Found

- The URL validator originally checked `url.search` and `url.hash`. The WHATWG URL getters return an empty string for both an absent component and an explicitly empty component, so base URLs ending in `?`, `#`, or `?#` incorrectly passed validation. The guard now checks the canonical `url.href` for the component delimiters, while still allowing percent-encoded delimiter characters in path data.
- The clock assertion referenced `ALLOWED_SERVER_SKEW_MS` without declaring it, so the snippet would not type-check or run as shown. The workflow now passes a non-secret skew-budget variable, and the TypeScript example validates it as a non-negative safe integer before using it in both bounds.

## Review Notes

- All other reviewed code, YAML, commands, links, and explanations are technically correct against the current documentation. In particular, the trailing-slash `baseURL` plus `./v1/...` resolution, `retain-on-first-failure`, `--workers=1`, `--repeat-each=10`, GitHub secret behavior, run identifiers, and service-container topology are accurate.
- `testInfo.testId` requires Playwright 1.32 or later, and `retain-on-first-failure` requires Playwright 1.43 or later. The post targets current Playwright and does not promise compatibility with older releases.
- The timestamp sample establishes that the value has an explicit offset suffix and is parseable by the current JavaScript runtime. `Date.parse()` is not a strict RFC 3339 or calendar validator; use a schema-aware parser if the API contract requires strict format validation.
- A failed first attempt followed by a passing retry is reported by Playwright as flaky, and the configured trace preserves the first failure, but the run succeeds by default. Teams whose policy requires flaky tests to fail CI can enable Playwright's `failOnFlakyTests` setting or `--fail-on-flaky-tests` CLI option.
- `TZ=UTC` works in current Node.js. `Etc/UTC` is the form explicitly used in Node's documented basic time-zone identifier examples and is preferable when maximizing portability across runtimes.
