# Validation Summary: How to Parse JSON Logs with Promtail

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Promtail
- Promtail pipeline stages
- JSON parsing with JMESPath
- Loki labels
- Timestamp parsing
- Docker JSON logs
- Kubernetes log collection

## Sources Consulted
- Grafana Loki documentation: Promtail agent, including deprecation and EOL notice - https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki documentation: Promtail json stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/
- Grafana Loki documentation: Promtail labels stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Loki documentation: Promtail match stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/match/
- Grafana Loki documentation: Promtail timestamp stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/timestamp/
- Grafana Loki documentation: Promtail output stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/output/
- Grafana Loki documentation: Promtail template stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/template/
- Grafana Loki documentation: Promtail drop stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/drop/
- Grafana Loki documentation: Promtail replace stage - https://grafana.com/docs/loki/latest/send-data/promtail/stages/replace/

## Issues Found
- Promtail lifecycle status was outdated for the validation date. Added a note that Promtail reached end-of-life on March 2, 2026 and that new deployments should use Grafana Alloy or another supported Loki client.
- JSON expressions for keys containing special characters were incorrect. Updated `@timestamp` expressions to use JMESPath literal-key syntax (`'"@timestamp"'`), changed the hyphenated nested key example to `request.headers."x-trace-id"`, and changed ECS `log.level` to `'"log.level"'`.
- The mixed-format example used a `match` selector against `level` before it was a Loki label. Added a `labels` stage before the `match` stage and another inside the fallback stages so the selector and fallback label update operate on labels as Promtail expects.

## Review Notes
Promtail is now end-of-life as of March 2, 2026. The corrected examples remain technically valid for existing Promtail deployments, but future content should prefer Grafana Alloy examples for new Loki log collection setups.
