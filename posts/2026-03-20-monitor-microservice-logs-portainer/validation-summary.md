# Validation Summary: How to Monitor Microservice Logs Across Containers in Portainer

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Portainer (built-in container log viewer)
- Docker (CLI logs commands, Compose, logging drivers)
- Loki (log aggregation, schema_config v13 with tsdb store)
- Promtail (log collector with docker_sd_configs)
- Grafana (visualization, datasource provisioning, derivedFields)
- LogQL (query language for Loki)
- Loki Docker logging driver plugin

## Sources Consulted
- Grafana Loki Docker driver configuration: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Promtail documentation and EOL announcement: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy (Promtail replacement): https://grafana.com/docs/alloy/latest/
- Docker logging drivers documentation: https://docs.docker.com/engine/logging/
- Grafana datasource provisioning: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found

1. **Invalid duration format in Loki Docker driver options (Step 5).** The original post used bare numbers for `loki-timeout: "1000"`, `loki-max-backoff: "1000"`, and `loki-min-backoff: "100"`. The Loki Docker driver parses these via Go's `time.ParseDuration`, which requires unit suffixes (`ns`, `us`, `ms`, `s`, `m`, `h`). Bare numbers will be rejected. Fixed to documented defaults: `loki-timeout: "10s"`, `loki-max-backoff: "5s"`, `loki-min-backoff: "500ms"`.

2. **Promtail EOL status not noted (Step 4).** The post is dated 2026-03-20, but Promtail reached end of life on 2026-03-02. Grafana now recommends Alloy as the replacement. The Promtail config shown is still functional for existing deployments, but readers in 2026+ would be misled into adopting an EOL collector. Added a brief inline note pointing readers to Grafana Alloy for new installations, while leaving the original Promtail example intact.

## Review Notes

- The Loki `schema_config` using `store: tsdb` with `schema: v13` is the current officially recommended setup — verified.
- All `docker logs` CLI flags (`--tail`, `-f`, `--since`) are correct and current.
- LogQL queries in Step 6 are syntactically valid, including `|= "ERROR"` line filters, `| json` parsing, label filters, and `rate(...)` over a range.
- The Grafana datasource provisioning file uses `$${__value.raw}` (double dollar). This is the correct escaping when the file is processed by Docker Compose variable interpolation; for files mounted as a static volume that bypasses Compose interpolation, single `$` would also work. Both forms are seen in the wild and current Grafana docs accept both, so this was not modified.
- `loki-batch-size: "400"` (400 bytes) is technically valid syntax but extremely small compared to the 1 MiB default. It will work but is suboptimal in practice. Left unchanged since it is not technically incorrect.
- The `derivedFields` example uses `datasourceUid: Jaeger` together with a `url` field; in current Grafana, when `datasourceUid` matches an actual provisioned UID, Grafana builds the link automatically and `url` is ignored. The example will render the field either way, so left unchanged.
