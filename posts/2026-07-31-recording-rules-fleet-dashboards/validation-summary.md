# Validation Summary: How to Build Recording Rules for Fleet-Wide Infrastructure Dashboards Without Expensive Live Queries

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus recording rules
- `promtool`
- Node Exporter
- Infrastructure dashboards
- Remote write

## Sources Consulted

- [Prometheus: Defining recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus: Recording rule best practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus: Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus: Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: Using the query log](https://prometheus.io/docs/guides/query-log/)
- [Prometheus Node Exporter source](https://github.com/prometheus/node_exporter)
- [Prometheus server source](https://github.com/prometheus/prometheus)

## Issues Found

- The CPU denominator counted instantaneous `node_cpu_seconds_total` series while the numerator used `rate(...[5m])`. Newly appearing CPU series or series that had become stale could therefore contribute to only one side of the ratio. Changed the denominator to count the same five-minute rate vector as the numerator and renamed it to `cluster:node_cpu_logical:count_rate5m` so the window is explicit.
- The `query_offset` explanation referred broadly to samples arriving through remote write. Clarified that the documented case is Prometheus acting as a remote-write receiver.

## Review Notes

- The complete YAML rule example passed `promtool check rules` with Prometheus 3.13.2; all eight recording rules parsed successfully.
- The post does not pin a Prometheus version. The reviewed fields and commands are current in Prometheus 3.13.2.
- The examples assume `cluster` is present on the queried series. As the post notes, a globally configured external label is not automatically a label on locally stored scrape series.
