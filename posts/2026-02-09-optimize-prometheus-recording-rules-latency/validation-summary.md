# Validation Summary: How to Optimize Prometheus Recording Rules to Reduce Query Latency by 90 Percent

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Prometheus recording rules
- PromQL
- Prometheus query logging
- Prometheus rule-group self-metrics
- Kubernetes kubectl commands
- YAML rule files

## Sources Consulted
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording rule naming best practices: https://prometheus.io/docs/practices/rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query log guide: https://prometheus.io/docs/guides/query-log/
- Prometheus rule-group metrics source: https://github.com/prometheus/prometheus/blob/main/rules/group.go
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- GNU Coreutils sort documentation: https://www.gnu.org/software/coreutils/sort

## Issues Found
- The slow-query command searched regular Prometheus pod logs for a non-standard `took ...s` format. Prometheus documents slow-query investigation through the JSON query log when `query_log_file` is enabled. Updated the text and command to read `/prometheus/query.log` and sort by `stats.timings.execTotalTime`.
- The rule-group interval YAML example omitted the required top-level `groups:` key for a Prometheus rule file. Added `groups:` to make the snippet match the documented rule file format.
- The network ratio recording rule was indented under the preceding comment, making the YAML invalid. Fixed the indentation so it is a normal rule entry in the `rules` list.
- The per-rule-group duration example used `prometheus_rule_group_duration_seconds{rule_group="namespace_metrics"}`. In current Prometheus, `prometheus_rule_group_duration_seconds` is a global summary without a `rule_group` label; per-group duration is exposed as `prometheus_rule_group_last_duration_seconds{rule_group="..."}`. Updated the example.

## Review Notes
The edited rule snippets and PromQL expressions were checked with `promtool check rules --lint=none` from Prometheus 3.12.0. A combined check of examples can trigger duplicate-rule lint warnings because the article repeats metric names across independent snippets; that does not affect the validity of the individual examples.
