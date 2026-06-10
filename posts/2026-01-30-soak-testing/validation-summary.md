# Validation Summary: How to Build Soak Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k6 (load/soak testing tool)
- Docker Compose
- Prometheus
- Grafana
- Node.js / Express
- `prom-client` (Prometheus client for Node.js)
- Python 3 (`statistics`, `typing` stdlib modules)
- GitHub Actions
- PostgreSQL, Redis (as supporting services)

## Sources Consulted
- k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- k6 metrics documentation (Rate, Trend, Counter): https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/
- k6 `handleSummary` reference: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- k6 Linux install instructions: https://grafana.com/docs/k6/latest/set-up/install-k6/#debian-ubuntu
- `prom-client` README and API: https://github.com/siimon/prom-client
- Node.js `process.memoryUsage()` docs: https://nodejs.org/api/process.html#processmemoryusage
- Docker Compose `healthcheck` and `deploy.resources` references: https://docs.docker.com/reference/compose-file/services/
- Prometheus scrape configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus `histogram_quantile` / `rate` function references: https://prometheus.io/docs/prometheus/latest/querying/functions/
- GitHub Actions cron syntax: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
- `actions/checkout@v4` and `actions/upload-artifact@v4` action READMEs

## Issues Found
1. **k6 thresholds — duplicate object key for `http_req_duration`.** The original `thresholds` block declared `'http_req_duration'` twice (once for `p(95)<500`, once for `p(99)<1000`). In JavaScript, the second key silently overwrites the first, so the P95 threshold was being dropped at runtime. Per the k6 thresholds documentation, multiple thresholds for the same metric must be combined into a single array. Fixed by merging them into `'http_req_duration': ['p(95)<500', 'p(99)<1000']`.

## Review Notes
- The Node.js metrics middleware uses `process._getActiveHandles()` and `process._getActiveRequests()`, which are undocumented internal APIs (underscore-prefixed). They still work on current Node.js LTS releases but are not part of the public API. A more future-proof alternative is `process.getActiveResourcesInfo()` (available since Node.js 17.3.0). Left as-is since the code is functional and `prom-client`'s `collectDefaultMetrics` already includes equivalent default handle/request counts.
- The custom `nodejs_heap_used_bytes` gauge overlaps with `prom-client`'s default `nodejs_heap_size_used_bytes` metric (exposed automatically by `collectDefaultMetrics`). Not incorrect, just redundant — left untouched as it does not affect correctness.
- `version: '3.8'` in the Compose file is treated as obsolete by Docker Compose v2 (produces a warning, but the file still parses and runs). Common in tutorials; left as-is.
- The k6 GPG-based install snippet matches the current official Linux install instructions (Ubuntu keyserver + `signed-by` keyring + `dl.k6.io/deb stable main`).
- The Prometheus scrape config, GitHub Actions cron syntax, `actions/*@v4` versions, and Grafana panel queries (`histogram_quantile`, `rate`, regex matcher `status=~"5.."`) are all valid.
