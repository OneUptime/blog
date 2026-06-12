# Validation Summary: How to Debug k6 Test Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Grafana k6
- k6 JavaScript APIs
- k6 HTTP module and metrics
- k6 CLI options
- GitHub Actions
- DNS and TLS debugging

## Sources Consulted
- Grafana k6 Options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 HTTP Response API: https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/
- Grafana k6 HTTP Params API: https://grafana.com/docs/k6/latest/javascript-api/k6-http/params/
- Grafana k6 Modules documentation: https://grafana.com/docs/k6/latest/using-k6/modules/
- Grafana k6 JavaScript and TypeScript compatibility mode: https://grafana.com/docs/k6/latest/using-k6/javascript-typescript-compatibility-mode/
- Grafana k6 HTTP debugging: https://grafana.com/docs/k6/latest/using-k6/http-debugging/
- Grafana k6 Thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 check API: https://grafana.com/docs/k6/latest/javascript-api/k6/check/
- Grafana k6 fail API: https://grafana.com/docs/k6/latest/javascript-api/k6/fail/
- Grafana k6 browser API: https://grafana.com/docs/k6/latest/javascript-api/k6-browser/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- GitHub Actions expressions and status check functions: https://docs.github.com/actions/reference/evaluate-expressions-in-workflows-and-actions
- GitHub Actions workflow syntax: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions

## Issues Found
- The post said `require('k6/http')` was unsupported. k6 supports a custom CommonJS `require()` for built-in k6 modules, local files, and remote scripts, but it does not support Node.js module resolution. Updated the wording and comment to reflect that distinction.
- The network debugging example used a top-level `timeout` option. k6 request timeouts are configured per HTTP request with `Params.timeout`; the documented top-level timeout options are for setup/teardown, not general HTTP requests. Removed the invalid top-level option while keeping the per-request timeout.
- The DNS example used `K6_DNS="prefer_ipv4"`, which is not valid k6 DNS option syntax. Updated it to `K6_DNS="policy=preferIPv4"`.
- The GitHub Actions CI example used `if: failure()` after a `continue-on-error: true` step. Added an `id` to the k6 step and changed the artifact and analysis conditions to check `steps.k6.outcome == 'failure'`.
- The standalone rate limiting, authentication expiry, and timeout fix snippets used `http` without importing `k6/http`. Added the missing imports.
- The timeout fix showed `timeout: '60s'` while saying to increase the timeout, but 60 seconds is the documented default request timeout. Changed the example to `120s`.

## Review Notes
The remaining k6 examples and commands matched the current Grafana k6 documentation. The `fail()` example is accurate for aborting the current iteration; it does not by itself fail the whole test unless paired with thresholds or other failure logic.
