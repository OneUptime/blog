# Validation Summary: How to Ship Logs to Loki with Promtail

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Promtail
- Grafana Alloy migration context
- YAML configuration
- Promtail pipeline stages
- Docker
- systemd
- Kubernetes DaemonSets and service discovery
- Prometheus metrics / PromQL

## Sources Consulted
- Grafana Loki Promtail agent documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail v2.9 configuration reference: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/configuration/
- Grafana Loki Promtail pipeline stages reference: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/stages/
- Grafana Loki Promtail metrics stage documentation: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/stages/metrics/
- Grafana Loki Promtail drop stage documentation: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/stages/drop/
- Grafana Loki Promtail output stage documentation: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/stages/output/
- Grafana Loki Promtail replace stage documentation: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/stages/replace/
- Grafana Loki Promtail labelallow documentation: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/stages/labelallow/
- Grafana Loki Promtail labeldrop documentation: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/stages/labeldrop/
- Promtail 2.9.4 binary `-help`, `--version`, and `-check-syntax` output.

## Issues Found
- The post described Promtail as the official current Loki collection agent. Grafana now marks Promtail EOL as of March 2, 2026, with future development in Grafana Alloy. Updated the introduction to describe Promtail as legacy and to recommend Alloy or another supported client for new production deployments.
- The installation comment said "Download latest release" while pinning Promtail 2.9.4. Changed it to "Download a Promtail 2.9.x release."
- The basic and production configs used `${HOSTNAME}` without enabling Promtail's `-config.expand-env=true` flag. Replaced those examples with literal placeholder label values to avoid non-expanding environment variables and to avoid breaking `${1}` capture-group replacement examples.
- The multiple-client example implied simple replication. Grafana's configuration reference warns that multiple clients are sent on a single thread and one failing Loki endpoint can affect others. Updated the comment to note that failure behavior.
- The label manipulation example said `labelallow` renames labels. It actually allowlists labels. Updated the comment.
- The email redaction regex used `[A-Z|a-z]`, which includes `|` as a valid character in the TLD. Updated it to `[A-Za-z]`.
- In the production JSON pipeline, the debug drop and PII redaction ran after `output`, so they would no longer operate on the original JSON fields as intended. Changed the debug drop to use the extracted `level` value and redaction to operate on the extracted `message` before `output`.

## Review Notes
- Promtail 2.9.4 is end-of-life as of the validation date. The article remains useful for existing Promtail environments, but future content should prefer Grafana Alloy.
- Representative configs were validated with the Promtail 2.9.4 binary using `-check-syntax`, including the basic config, the full production config, and the redaction pipeline.
