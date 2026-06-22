# Validation Summary: How to Configure Load Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k6
- Locust
- JavaScript
- Python
- Docker
- GitHub Actions
- InfluxDB output for k6
- Load testing concepts and metrics

## Sources Consulted
- Grafana k6 installation documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 InfluxDB output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/influxdb/
- Grafana k6 custom summary documentation: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- Grafana k6 scenarios and executors documentation: https://grafana.com/docs/k6/latest/using-k6/scenarios/
- Locust locustfile documentation: https://docs.locust.io/en/stable/writing-a-locustfile.html
- Locust quickstart / headless CLI documentation: https://docs.locust.io/en/stable/quickstart.html
- GitHub Actions events documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data

## Issues Found
- The metadata referenced JMeter and Artillery even though the post only covers k6 and Locust. Updated the tags and description to match the actual technical content.
- The Debian/Ubuntu k6 installation commands used an older keyserver-based GPG flow. Updated both the installation section and GitHub Actions workflow to the current official `curl | gpg --dearmor` keyring setup from Grafana's k6 documentation.
- The Locust `AdminUser` comment said there would be one admin for every ten regular users, but `WebsiteUser` did not set `weight = 10`, so both user classes would have defaulted to equal weight. Added `weight = 10` to `WebsiteUser`.
- The GitHub Actions example attempted to grep threshold status from `--out json=results.json`. k6's JSON output is granular metric output, not an end-of-test summary object with a `thresholds` field. Removed the invalid parsing step and left threshold enforcement to `k6 run`, which exits non-zero when thresholds fail.

## Review Notes
- The example scripts target placeholder domains and illustrative endpoints, so they were reviewed for API correctness and syntax rather than executed against a live system.
- The Locust snippet imports `json` but does not use it. This is harmless and was left unchanged because it is not a technical correctness issue.
