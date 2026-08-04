# Validation Summary: How to Route Different Metrics to Different Remote Write Backends by Label

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Prometheus Remote Write
- Prometheus write relabeling and RE2 regular expressions
- Prometheus scrape configuration and labels
- PromQL queue-health queries
- Grafana Mimir multitenancy

## Sources Consulted

- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus relabel configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus static target configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#static_config)
- [Prometheus data model](https://prometheus.io/docs/concepts/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write queue metrics source](https://github.com/prometheus/prometheus/blob/v3.12.0/storage/remote/queue_manager.go)
- [Prometheus 3.12.0 release](https://github.com/prometheus/prometheus/releases/tag/v3.12.0)
- [Grafana Mimir authentication and multitenancy](https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/)
- [Grafana Mimir HTTP API](https://grafana.com/docs/mimir/latest/references/http-api/)

## Issues Found

- The metric-family regexes required an underscore after each base name. That routed classic histogram suffixes such as `_bucket`, `_sum`, and `_count`, but missed the exact base name used by native histograms or another exact-name metric. Both the high-resolution `keep` rule and standard-retention `drop` rule now use `(http_request_duration_seconds|rpc_client_duration_seconds)(_.*)?`, keeping the routes complementary while matching both base names and suffixed family members.
- The post stated unconditionally that a high-cardinality routing label increases the number of locally ingested series. Added labels can increase series cardinality when they distinguish otherwise identical label sets, but a correlated label does not necessarily create additional series. The wording now says such a label can increase cardinality and clarifies that outbound `labeldrop` does not reverse cardinality already created locally.
- “Silent loss” could imply that Prometheus discards locally stored data when no Remote Write filter matches. The sentence now states precisely that the unlabeled data is omitted from every remote destination; local TSDB ingestion is unaffected.

## Review Notes

- The corrected representative configuration was accepted by `promtool check config` from Prometheus 3.12.0.
- The current Prometheus schema confirms that each Remote Write destination starts its own queue, `write_relabel_configs` runs before sending, configured names must be unique, missing source labels become empty strings, relabel regexes are fully anchored, and `labeldrop` must preserve outbound series uniqueness.
- The documented queue metric names and their `remote_name` and `url` labels are current in Prometheus 3.12.0. Grafana Mimir documents `POST /api/v1/push` and the static `X-Scope-OrgID` tenant header used by the example.
