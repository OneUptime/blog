# Validation Summary: How to Handle Smoke Testing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Smoke testing strategy
- Python 3.11
- aiohttp
- Playwright Test
- GitHub Actions
- Slack GitHub Action
- Kubernetes kubectl
- Prometheus Python client and Pushgateway
- Bash and curl

## Sources Consulted
- Python documentation for `asyncio`, dataclasses, enums, and typing: https://docs.python.org/3/
- aiohttp client timeout documentation: https://docs.aiohttp.org/en/stable/client_quickstart.html#timeouts
- Playwright Test documentation for `test.use`, `baseURL`, CLI usage, and CI setup: https://playwright.dev/docs/test-use-options and https://playwright.dev/docs/ci
- Playwright Page API documentation for `page.goto`: https://playwright.dev/docs/api/class-page#page-goto
- GitHub Actions setup-python documentation: https://github.com/actions/setup-python
- GitHub Actions setup-node documentation: https://github.com/actions/setup-node
- GitHub webhook documentation for `deployment_status`: https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_status
- Slack GitHub Action documentation for incoming webhooks: https://docs.slack.dev/tools/slack-github-action/sending-data-slack-incoming-webhook/
- Kubernetes Deployment rollout documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl rollout undo` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Prometheus Python client Pushgateway documentation: https://prometheus.github.io/client_python/exporting/pushgateway/

## Issues Found
- The Python smoke runner counted only `FAILED` results as failures, so `TIMEOUT` and `ERROR` results could incorrectly produce `all_passed: true`. Updated the summary logic to treat every non-passing result as a failure.
- The Python smoke runner reported total duration as the sum of individual request durations even though tests run in parallel. Added wall-clock run timing so the report reflects actual elapsed suite time.
- The Playwright example used relative URLs but did not configure `baseURL`. Added `test.use({ baseURL: process.env.BASE_URL || 'http://localhost:3000' })` so `page.goto('/')` and API request paths resolve correctly.
- The Playwright homepage test registered the `pageerror` listener after navigation, which could miss JavaScript errors during initial page load. Moved the listener before `page.goto('/')` and added a null response assertion before checking status.
- The GitHub Actions workflow installed the Python Playwright package but ran a JavaScript Playwright Test file that imports `@playwright/test`. Updated the workflow to set up Node.js, install `@playwright/test`, install Chromium with `npx playwright install --with-deps chromium`, and run the test with `npx playwright test`.
- The Slack notification step used an older Action version and v1-style webhook configuration. Updated it to the current documented incoming-webhook inputs for `slackapi/slack-github-action@v3.0.3`.
- The Prometheus Pushgateway example passed `registry=None` to `push_to_gateway`, but the official client expects a registry containing the metrics to push. Added a `CollectorRegistry`, registered the metrics with it, and passed that registry to `push_to_gateway`.

## Review Notes
The remaining examples are intentionally generic and use placeholder endpoints, credentials, service names, and database helpers. Those placeholders are acceptable for a guide, but production use should source smoke-test credentials from a secret manager and avoid mutating production data unless cleanup and idempotency are guaranteed.
