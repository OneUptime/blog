# Validation Summary: How to Analyze k6 Test Results

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana k6
- k6 JavaScript test scripts
- k6 thresholds, metrics, tags, scenarios, and custom summaries
- JSON Lines output from k6
- Python JSON/statistics analysis
- Bash, jq, and bc
- Mermaid diagrams

## Sources Consulted
- Grafana k6 built-in metrics reference: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 results analysis example: https://grafana.com/docs/k6/latest/examples/get-started-with-k6/analyze-results/
- Grafana k6 tags and groups documentation: https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/
- Grafana k6 HTTP requests documentation: https://grafana.com/docs/k6/latest/using-k6/http-requests/
- Grafana k6 Trend documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/trend/
- Grafana k6 Counter documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/counter/
- Grafana k6 ramping-vus executor documentation: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
- Grafana k6 custom summary documentation: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/

## Issues Found
- The metric flow diagram showed `http_req_blocked`, `http_req_connecting`, and `http_req_tls_handshaking` inside `http_req_duration`. Current k6 documentation defines `http_req_duration` as `http_req_sending + http_req_waiting + http_req_receiving`, excluding initial blocked, TCP connection, and TLS handshake time. Updated the diagram so those phases precede the `http_req_duration` subgraph.
- The `http_req_blocked` table description said it measured "Time waiting for TCP connection". Updated it to match the current k6 definition: time blocked before initiating the request, often while waiting for a free TCP connection slot.
- The example `http_req_failed` output used cross marks for failed requests and check marks for successful requests. k6 displays Rate counters with the check mark count for non-zero values of that metric, so for `http_req_failed` that count represents failed requests. Updated the two sample outputs to use `✓` for failed-request counts and `✗` for non-failed counts, matching official k6 examples.

## Review Notes
- The local environment did not have the `k6` CLI installed, so command and API validation was performed against official Grafana k6 documentation.
- The Python and jq percentile calculations are simple rank-based approximations for ad hoc analysis; they may not exactly match k6's internal percentile implementation for all sample sizes.
