# Validation Summary: How to Debug Promtail Not Shipping Logs

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Promtail
- Grafana Loki
- Grafana Alloy migration context
- Prometheus metrics and alerting rules
- Docker and Docker Compose
- Kubernetes service account permissions
- Linux systemd and file permissions
- YAML configuration

## Sources Consulted
- Grafana Loki documentation: Promtail agent EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki v2.9.4 Promtail configuration reference: https://github.com/grafana/loki/blob/v2.9.4/docs/sources/send-data/promtail/configuration.md
- Grafana Loki v2.9.4 Promtail scraping reference: https://github.com/grafana/loki/blob/v2.9.4/docs/sources/send-data/promtail/scraping.md
- Grafana Loki v2.9.4 Promtail JSON stage reference: https://github.com/grafana/loki/blob/v2.9.4/docs/sources/send-data/promtail/stages/json.md
- Grafana Loki v2.9.4 Promtail timestamp stage reference: https://github.com/grafana/loki/blob/v2.9.4/docs/sources/send-data/promtail/stages/timestamp.md
- Grafana Loki v2.9.4 Promtail drop stage reference: https://github.com/grafana/loki/blob/v2.9.4/docs/sources/send-data/promtail/stages/drop.md
- Grafana Loki v2.9.4 Promtail match and output stage source/docs: https://github.com/grafana/loki/tree/v2.9.4/clients/pkg/logentry/stages
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki v2.9.4 Promtail server and metrics source: https://github.com/grafana/loki/tree/v2.9.4/clients/pkg/promtail

## Issues Found
- Promtail was described as the primary Loki log collection agent. Updated the introduction to state that Promtail is now a legacy agent, EOL as of March 2, 2026, and that Grafana recommends migration to Grafana Alloy or another supported client.
- The file target label example said `job` was required. Updated the wording because `__path__` is required for file targets, while `job` is standard and useful but not strictly required.
- The pipeline debug example used an `output` stage with `source: output` without first extracting an `output` field. Updated the regex to capture the full line into a named `output` group.
- The JSON parsing failure example matched `{__error__="JSONParseError"}`, which is a Loki query-time error label pattern, not how Promtail handles malformed JSON in the JSON stage. Replaced it with `drop_malformed: true`.
- The timestamp example used `action_on_failure: keep`, which is not a valid Promtail timestamp action. Replaced it with `action_on_failure: skip`.
- The shell command `ls -la /var/log/app/**/*.log` relied on Bash `globstar` behavior that is not enabled by default. Replaced it with a portable `find` command.
- The `/targets` troubleshooting commands piped Promtail's HTML targets page to `jq`. Replaced those commands with plain `curl` and a simple `grep` check.
- The performance section described `target_config.sync_period` as limiting concurrent targets. Updated the comment to describe what the setting actually does: resync watched directories and tailed files.
- The drop-rate metrics used `promtail_dropped_entries_total`, which measures client-side send drops after retry failures. Updated pipeline drop monitoring and alerting to use `logentry_dropped_lines_total`.

## Review Notes
Promtail troubleshooting remains technically useful for existing deployments, but future new-agent content should prefer Grafana Alloy because Promtail is EOL and no longer receives support or updates.
