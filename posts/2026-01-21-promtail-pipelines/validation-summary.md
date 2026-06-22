# Validation Summary: How to Configure Promtail Pipelines

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Grafana Loki
- Promtail
- Promtail pipeline stages
- YAML configuration
- LogQL stream selectors
- Kubernetes service discovery

## Sources Consulted
- Grafana Loki documentation: Promtail agent, including deprecation and EOL status: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki documentation: Promtail pipeline stages index: https://grafana.com/docs/loki/latest/send-data/promtail/stages/
- Grafana Loki documentation: json stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/
- Grafana Loki documentation: logfmt stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/logfmt/
- Grafana Loki documentation: regex stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/regex/
- Grafana Loki documentation: labels stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Loki documentation: static_labels stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/static_labels/
- Grafana Loki documentation: timestamp stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/timestamp/
- Grafana Loki documentation: output stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/output/
- Grafana Loki documentation: template stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/template/
- Grafana Loki documentation: match stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/match/
- Grafana Loki documentation: drop stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/drop/
- Grafana Loki documentation: replace stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/replace/
- Grafana Loki documentation: Troubleshooting Promtail: https://grafana.com/docs/loki/latest/send-data/promtail/troubleshooting/

## Issues Found
- Promtail is no longer a current default recommendation. Grafana documentation says Promtail reached EOL on March 2, 2026, so I added a short caveat recommending Grafana Alloy or another supported client for new deployments.
- The post claimed to cover all pipeline stages, but it only covers common stages. I changed the wording to "common pipeline stages" and "common Promtail pipeline configuration patterns."
- The "Static Labels" example used the `labels` stage, which promotes extracted values to labels. I changed it to the correct `static_labels` stage.
- The "Label Mapping" example used a non-existent `labelmap` Promtail stage. I replaced it with a `template` stage that normalizes the value and then promotes it with `labels`.
- The JSON examples for `@timestamp` used `timestamp: '@timestamp'`, which is not the correct JMESPath expression for a field name containing `@`. I changed it to `timestamp: '"@timestamp"'`.
- The template output example extracted `message: msg` but referenced `.message` in the template. I changed the template to use `.msg`.
- The template condition example extracted `msg: message` but referenced `.message`. I changed it to `.msg`.
- The replace example used `$4` as a backreference in `replace`, which is not how Promtail documents replacement values. I changed the example to a full static redaction.
- The full application log example redacted the raw log line and then replaced output with the extracted `message`, which would bypass the redaction. I added `source: message` to the replace stage.
- The Kubernetes example matched on a `container` label without showing how that label is created and did not set `__path__`. I added relabeling for `container` and pod log paths.
- Several examples matched on `{level="..."}` before `level` had been promoted to a label. I added `labels` stages before those `match` stages.
- The config validation command used `-dry-run` for validation. I changed it to the documented `-check-syntax` flag.

## Review Notes
The post is technically relevant for existing Promtail installations, but Promtail is EOL as of March 2, 2026. Future content should prefer Grafana Alloy examples for new Loki log shipping deployments.
