# Validation Summary: How to Add Labels to Logs in Promtail

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Promtail
- Grafana Alloy
- LogQL
- Loki HTTP API
- Kubernetes service discovery
- Prometheus-style relabeling

## Sources Consulted
- Grafana Loki Promtail agent documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana Loki Promtail pipeline stages: https://grafana.com/docs/loki/latest/send-data/promtail/stages/
- Grafana Loki Promtail labels stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Loki Promtail labeldrop stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labeldrop/
- Grafana Loki Promtail labelallow stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labelallow/
- Grafana Loki Promtail template stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/template/
- Grafana Loki Promtail JSON, logfmt, and regex stages: https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/, https://grafana.com/docs/loki/latest/send-data/promtail/stages/logfmt/, https://grafana.com/docs/loki/latest/send-data/promtail/stages/regex/
- Grafana Loki labels and cardinality documentation: https://grafana.com/docs/loki/latest/get-started/labels/ and https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Grafana Loki LogQL and metric query documentation: https://grafana.com/docs/loki/latest/query/ and https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Prometheus Kubernetes service discovery configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config

## Issues Found
- Promtail lifecycle status was outdated for the validation date. Added a note that Promtail reached end-of-life on March 2, 2026 and that new deployments should use a supported collector such as Grafana Alloy.
- Path extraction examples used `relabel_configs` against wildcard `__path__` values as though they were per-file paths. Added a caveat for concrete paths and updated wildcard path extraction examples to use pipeline `regex` stages against Promtail's runtime `filename` label.
- Several path regexes escaped literal dots incorrectly or too loosely. Updated examples to use `\.log` where a literal `.log` suffix is intended.
- The node zone relabeling example used node metadata without enabling node metadata attachment for pod discovery. Added `attach_metadata: node: true`.
- The label mapping example used a non-existent Promtail `labelmap` pipeline stage. Replaced it with the supported `template` stage followed by the `labels` stage.
- The label drop example used a pipeline stage to drop Kubernetes discovery metadata labels. Changed it to a relabeling `labeldrop` rule, which is the correct place to handle `__meta_*` labels.
- The label keep example used a non-existent Promtail `labelkeep` pipeline stage. Changed it to a relabeling `labelkeep` rule.
- The stream cardinality LogQL examples were invalid or misleading. Replaced them with valid metric queries using `count_over_time` and aggregation by a concrete label.
- The complete configuration attempted to normalize a label after adding it with an invalid `labels: level: error` mapping. Replaced that block with a `template` normalization before the `labels` stage.
- The verification LogQL example used `label_format all_labels="{{__name__}}"`, which is not a useful way to verify log labels. Replaced it with a direct selector for the expected labels.

## Review Notes
The post is technically valid for maintaining existing Promtail installations, but Promtail is no longer supported after March 2, 2026. A future version of this article should consider using Grafana Alloy examples as the primary path.
