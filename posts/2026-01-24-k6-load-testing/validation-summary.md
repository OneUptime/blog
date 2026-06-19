# Validation Summary: How to Configure Load Testing with k6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k6
- JavaScript
- Load testing and performance testing
- k6 thresholds, checks, stages, metrics, and SharedArray
- GitHub Actions
- Grafana / InfluxDB output
- Docker, Homebrew, Chocolatey, and Debian/Ubuntu package installation

## Sources Consulted
- Grafana k6 installation documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 built-in metrics reference: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- Grafana k6 HTTP requests documentation: https://grafana.com/docs/k6/latest/using-k6/http-requests/
- Grafana k6 checks documentation: https://grafana.com/docs/k6/latest/using-k6/checks/
- Grafana k6 SharedArray documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/
- Grafana k6 execution context variables documentation: https://grafana.com/docs/k6/latest/using-k6/execution-context-variables/
- Grafana k6 Gauge documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/gauge/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 InfluxDB output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/influxdb/
- GitHub Actions expression/status check documentation: https://docs.github.com/actions/reference/evaluate-expressions-in-workflows-and-actions
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data

## Issues Found
- The Debian/Ubuntu installation command used the older keyserver-based GPG import flow. Updated both installation snippets to the current official `curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor ...` flow from Grafana's k6 install documentation.
- The custom metrics example used a `Gauge` named `active_orders` as if it accumulated active order count. k6 Gauge metrics keep only the latest value, so the example was changed to `last_order_item_count`, which matches Gauge semantics.
- The SharedArray example indexed users with `users[__VU % users.length]`. k6 `__VU` starts at 1, so this skipped the first user for VU 1. Updated it to `users[(__VU - 1) % users.length]`.
- The GitHub Actions workflow uploaded `results.json` only under the default success condition, so a failed k6 threshold run could skip the artifact upload. Added `if: always()` to the upload step so results are retained for failed load tests.

## Review Notes
- The k6 APIs used in the examples (`http.get`, `http.post`, `check`, `sleep`, `group`, `SharedArray`, `Counter`, `Trend`, `Rate`, `Gauge`, `stages`, `vus`, `duration`, thresholds, JSON output, and InfluxDB v1 output) are current and documented.
- The `max<5000` threshold example is syntactically valid, though Grafana's Trend documentation recommends percentiles over min/max thresholds because max values are outliers.
- The InfluxDB command shown uses k6's built-in InfluxDB v1 output. InfluxDB v2 requires the xk6 InfluxDB output extension.
