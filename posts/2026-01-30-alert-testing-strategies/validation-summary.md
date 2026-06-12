# Validation Summary: How to Build Alert Testing Strategies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Prometheus alerting rules and `promtool`
- Alertmanager routing, alert groups, silences, and webhook delivery
- Python alert test tooling with `prometheus_client`, Flask, pytest, and requests
- Kubernetes CronJob
- Chaos Mesh `NetworkChaos`
- GitHub Actions
- Slack webhook notifications

## Sources Consulted
- Prometheus unit testing for rules: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus HTTP API alerts endpoint: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Alertmanager overview and configuration: https://prometheus.io/docs/alerting/latest/alertmanager/ and https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager API v2 OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Prometheus Python client Pushgateway documentation: https://prometheus.github.io/client_python/exporting/pushgateway/
- Prometheus downloads page for current release version: https://prometheus.io/download/
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- GitHub Actions checkout documentation: https://github.com/actions/checkout

## Issues Found
- The `HighLatencyP99` alert rule only had a `summary`, but later tests asserted `description` and either `runbook_url` or `dashboard_url`. Added `description` and `dashboard_url` to the alert rule and its unit test expectation.
- The Prometheus unit test examples omitted annotations that are part of the expected expanded alert. Added the full expected annotations for the sample firing alerts.
- The GitHub Actions example installed Prometheus `v2.48.0`, which is old for a 2026 post. Updated the example to `v3.12.0`, the current Prometheus release listed by the official download page on 2026-06-12.
- The latency metric generator made only 1% of requests slow while claiming to simulate p99 latency above the threshold. Changed the slow-request rate to 5% so the p99 alert scenario is more likely to cross the threshold.
- The fire drill code used deprecated `datetime.utcnow()` and checked for a `resolved` state in Alertmanager's active-alert API. Replaced it with timezone-aware UTC timestamps and treated disappearance from `/api/v2/alerts` after being seen as resolution.
- The fire drill silence lookup iterated over all silences instead of using Alertmanager's documented `GET /api/v2/silence/{silenceID}` endpoint. Updated the helper to use the documented endpoint.
- The routing test claimed Alertmanager provides a route-test endpoint and used `POST /api/v2/alerts/groups`, but Alertmanager v2 defines `GET /alerts/groups`, not POST. Reworked the example to post a marked synthetic alert to `/api/v2/alerts` and inspect `/api/v2/alerts/groups`.
- The Slack routing test used a placeholder webhook URL that would always fail if run. Changed it to read `SLACK_WEBHOOK` from the environment.
- The E2E resolution test generated recovery traffic inside the trigger function before the runner checked for the firing alert. Moved recovery traffic until after the firing alert has been delivered.

## Review Notes
The remaining examples are intentionally illustrative and still require a real monitoring test environment, test receivers, representative Alertmanager routes, and safe non-production notification channels before they can be run as-is.
