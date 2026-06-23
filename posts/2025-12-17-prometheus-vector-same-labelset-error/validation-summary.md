# Validation Summary: How to Fix 'vector cannot contain metrics with same labelset' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus scrape configuration
- Prometheus recording rules and alerting rules
- Prometheus federation
- Prometheus relabeling
- Grafana panel queries
- Bash, curl, jq, yq, and promtool

## Sources Consulted
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus metric and label naming best practices: https://prometheus.io/docs/practices/naming/
- promtool 3.11.3 via the official `prom/prometheus:latest` Docker image

## Issues Found
- The original scrape-target example implied that two scrape jobs targeting the same endpoint directly create this PromQL result-vector error. Prometheus scrape labels such as `job` usually distinguish those series, and duplicate ingestion problems are not the same as duplicate output vectors. Replaced this with a correct example where `rate()` is applied to multiple metric names that share the same non-name labels.
- The aggregation section incorrectly implied that `sum(...) by (...)` can produce duplicate output label sets. PromQL aggregation combines series into one output per grouping label set. Replaced this with a binary-operator example, because arithmetic operators involving vectors drop the metric name and can expose duplicate label sets.
- The recording-rule example used an addition expression that would not create duplicate output label sets. Replaced it with a recording rule whose `labels` block overwrites a distinguishing label, which matches Prometheus rule-label behavior.
- The federation example was missing the `/federate` endpoint and `match[]` parameter required by Prometheus federation configuration. Added `metrics_path: '/federate'` and a `match[]` parameter.
- The duplicate-detection query counted one metric by selected labels, which cannot identify collisions caused by metric-name removal. Replaced it with a query that groups across multiple metric names by non-name labels.
- The recording-rule inspection query always returned at most one result per `job`. Replaced it with a query that checks whether rule-label overwrites would collapse distinct `service` values.
- The CI curl example placed raw PromQL in a query string. Replaced it with `curl -G --data-urlencode` and `jq -r` so expressions are URL-encoded and status comparison works without JSON quotes.
- The edge-case text claimed timing differences and restarts directly cause this duplicate-labelset error. Revised those examples to distinguish range-function metric-name removal from normal restart or replica label changes.

## Review Notes
PromQL examples added or changed in the review were syntax-checked with `promtool check rules` from the official Prometheus Docker image. The local environment did not have `promtool` or `yq` installed, so CLI validation for those local binaries was performed against official documentation and the Docker-provided `promtool`.
