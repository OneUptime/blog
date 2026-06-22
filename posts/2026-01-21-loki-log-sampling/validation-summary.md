# Validation Summary: How to Implement Log Sampling with Loki

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Grafana Loki
- Promtail pipeline stages
- Grafana Alloy `loki.process`
- LogQL selectors and PromQL metrics
- Python application-level sampling
- Grafana dashboards

## Sources Consulted
- Grafana Loki documentation: Promtail agent EOL notice - https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki documentation: Promtail `sampling` stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/sampling/
- Grafana Loki documentation: Promtail `drop` stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/drop/
- Grafana Loki documentation: Promtail `match` stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/match/
- Grafana Loki documentation: Promtail `template` stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/template/
- Grafana Loki documentation: Promtail `limit` stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/limit/
- Grafana Loki documentation: Promtail `labels` stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Alloy documentation: `loki.process` stages - https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/

## Issues Found
- Promtail is now end-of-life as of March 2, 2026. Added a note that the Promtail examples apply to existing deployments and that new deployments should use Grafana Alloy.
- Several examples parsed `level` but then matched against raw log text. Added normalized `level` labels and changed `match.selector` values to use label matchers.
- The drop-stage sampling example implied probabilistic drop support. Corrected it to state that probabilistic sampling should use the `sampling` stage; `drop` supports exact-value, regex, age, and length filters.
- Hash-based examples used unsupported template functions such as `mod` and `atoi`. Replaced them with a supported pattern where the application emits a stable sample bucket, and with trace-ID suffix sampling using `drop.source` plus a regex.
- Rate limiting by `by_label_name` requires `drop: true` and a real label. Added the `service` label and `drop: true` where needed.
- Priority-based examples used `action: keep` as though it stopped later sampling stages. Reworked the selectors so protected INFO logs are excluded from sampling and DEBUG logs are dropped with `match action: drop`.
- The slow-request example relied on a fragile Promtail template numeric comparison. Replaced it with an explicit `is_slow` field emitted by the application.
- The dropped-log metric used `promtail_dropped_entries_total`, which does not match the documented pipeline drop metric. Updated it to `logentry_dropped_lines_total`.

## Review Notes
The corrected Promtail examples are suitable for legacy Promtail deployments. Future revisions should consider replacing the Promtail YAML examples with Alloy configuration blocks, since Promtail no longer receives updates.
