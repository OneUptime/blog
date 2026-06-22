# Validation Summary: How to Drop and Filter Logs in Promtail

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Grafana Loki
- Promtail pipeline stages
- Promtail Kubernetes service discovery
- Prometheus / PromQL metrics
- Grafana dashboard query configuration

## Sources Consulted
- Grafana Loki documentation: Promtail drop stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/drop/
- Grafana Loki documentation: Promtail sampling stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/sampling/
- Grafana Loki documentation: Promtail match stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/match/
- Grafana Loki documentation: Promtail configuration and Kubernetes service discovery: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana Loki documentation: Promtail deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy documentation for equivalent Loki processing stages, used to cross-check current stage semantics: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/

## Issues Found
- The post used `drop.value` as a probabilistic sampling setting. In Promtail, `value` is an exact-match condition used with `source`; probabilistic sampling is handled by the `sampling` stage with a `rate` value. Replaced the affected examples with `sampling` stages.
- The conditional sampling example parsed a `path` field and then used a `drop` stage with `value`, which would not sample only the intended endpoint pattern. Changed it to a `match` selector with a line regex filter and a nested `sampling` stage.
- The complete configuration example used `drop` with both `expression` and `value` to represent 90% sampling. Replaced it with a `match` selector and nested `sampling` stage.
- The Promtail metrics examples referenced `promtail_dropped_entries_total`, which is not the documented drop counter. Replaced it with `logentry_dropped_lines_total` and adjusted the percentage query to divide summed drop rate by summed read-line rate.
- Two multiline regex examples were written as YAML block scalars with embedded newlines and indentation, making them unlikely to match the intended one-line log messages. Replaced them with single-line RE2 expressions.
- The post did not mention Promtail's current lifecycle status. Added a concise note that Promtail is deprecated and reached end-of-life on March 2, 2026, while keeping the guide applicable to existing deployments.

## Review Notes
The Promtail configuration patterns remain useful for existing deployments, but new deployments should consider Grafana Alloy or OpenTelemetry Collector because Promtail is no longer maintained after its March 2, 2026 EOL.
