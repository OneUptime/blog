# Validation Summary: How to Set Up k6 for Performance Testing APIs on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux / RPM-based Linux
- Grafana k6
- JavaScript k6 test scripts
- HTTP API performance testing
- k6 checks, thresholds, scenarios, and SharedArray
- k6 JSON, CSV, and Prometheus Remote Write outputs
- GitHub Actions CI/CD

## Sources Consulted
- Grafana k6 installation documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 GitHub releases API and release assets: https://api.github.com/repos/grafana/k6/releases/latest
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 Prometheus Remote Write documentation: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
- Grafana k6 scenarios documentation: https://grafana.com/docs/k6/latest/using-k6/scenarios/
- Grafana k6 constant-arrival-rate executor documentation: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 HTTP Response API documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/
- Grafana k6 HTTP POST API documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-http/post/
- Grafana k6 SharedArray documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/
- Grafana setup-k6-action documentation: https://github.com/grafana/setup-k6-action
- Grafana run-k6-action documentation: https://github.com/grafana/run-k6-action
- Archived legacy grafana/k6-action repository: https://github.com/grafana/k6-action

## Issues Found
- The fallback binary download command used `https://github.com/grafana/k6/releases/latest/download/k6-linux-amd64.tar.gz`, which currently returns 404 because the release asset filename includes the version. Updated the example to use the current `v2.0.0` tarball asset and matching extracted directory name.
- The content-type check used `r.headers['Content-Type'].includes('application/json')`, which can fail if the header is absent and is brittle with current response header handling. Updated it to `String(r.headers['Content-Type'] || '').includes('application/json')`.
- The Prometheus Remote Write command omitted the remote write endpoint configuration. Added `K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write` before the `k6 run --out experimental-prometheus-rw` command.
- The GitHub Actions workflow used the archived legacy `grafana/k6-action@v0.3.1` action with the old `filename` input. Replaced it with the maintained `grafana/setup-k6-action@v1` and `grafana/run-k6-action@v1` actions using the current `path` input.

## Review Notes
- The Prometheus Remote Write output is still documented by Grafana as experimental, so future k6 releases may introduce breaking changes.
- The binary fallback example is version-specific. The repository installation method remains the better RHEL path because it can be upgraded through `dnf`.
