# Validation Summary: How to Mask Sensitive Data in Loki

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Promtail pipeline stages
- LogQL
- YAML configuration
- PII and credential masking patterns

## Sources Consulted
- Grafana Loki Promtail replace stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/replace/
- Grafana Loki Promtail json stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/
- Grafana Loki Promtail template stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/template/
- Grafana Loki Promtail output stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/output/
- Grafana Loki Promtail match stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/match/
- Grafana Loki LogQL metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki LogQL log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Alloy loki.process documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Loki Promtail replace stage source code: https://github.com/grafana/loki/blob/main/clients/pkg/logentry/stages/replace.go

## Issues Found
- Promtail is deprecated and has reached end-of-life as of the review date. Added a caveat that the Promtail examples are for existing deployments and that Grafana Alloy should be used for new deployments.
- Several `replace` examples used full-match regexes without capture groups. Promtail's replace stage replaces captured groups, so those examples would not redact as intended. Updated the expressions to capture the sensitive portion that should be replaced.
- Several examples used `$1`, `$2`, or `$4` style replacements. Promtail's `replace` value is parsed as a Go template rather than a regex replacement string, so those references would not work as written. Reworked the regexes to capture only the sensitive text while leaving the surrounding key, URL, domain, or final digits outside the capture.
- Several YAML regex strings included single quotes inside single-quoted YAML scalars using backslash escaping. YAML single-quoted strings require doubled single quotes, so those snippets were invalid YAML. Updated the affected expressions to use valid YAML quoting.
- The JSON field masking example replaced extracted values but did not update the outgoing log line. Added a `template` stage and `output` stage so the masked extracted fields are used as the final log line sent to Loki.

## Review Notes
The masking regexes are examples, not complete data-loss-prevention rules. They may still need tuning for local log formats, false positives, temporary AWS key prefixes, and non-US PII formats. The LogQL verification and alerting examples are syntactically aligned with Loki's documented log and metric query forms.
