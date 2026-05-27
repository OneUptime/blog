# Validation Summary: How to Perform Load Testing with k6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana k6
- JavaScript
- HTTP API load testing
- k6 thresholds, scenarios, groups, and custom metrics
- GitHub Actions
- Debian/Ubuntu package installation

## Sources Consulted
- Grafana k6 Install k6 documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 Thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 Scenarios documentation: https://grafana.com/docs/k6/latest/using-k6/scenarios/
- Grafana k6 Tags and Groups documentation: https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/
- Grafana k6 Built-in metrics reference: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- Grafana k6 Checks documentation: https://grafana.com/docs/k6/latest/using-k6/checks/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 JavaScript API documentation for `k6`, `k6/http`, and `k6/metrics`: https://grafana.com/docs/k6/latest/javascript-api/

## Issues Found
- The GitHub Actions install snippet used an older keyserver-based GPG command. Updated it to the current official Debian/Ubuntu installation flow using `curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg`.
- The sample k6 output showed the checks summary as a single `checks` line. Current k6 documentation shows the end-of-test summary display split into `checks_total`, `checks_succeeded`, and `checks_failed`, so the sample output and key metric label were updated.

## Review Notes
The k6 script examples use current APIs and valid option shapes for stages, thresholds, tagged threshold expressions, groups, scenarios, HTTP requests, custom metrics, and JSON output. The example URLs under `api.example.com` are placeholders and would need replacement with a real API before running the tests.
