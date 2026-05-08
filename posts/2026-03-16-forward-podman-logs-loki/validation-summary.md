# Validation Summary: How to Forward Podman Container Logs to Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Grafana Loki
- Grafana
- Promtail
- Fluent Bit
- journald
- LogQL
- Bash

## Sources Consulted
- Grafana Loki install documentation: https://grafana.com/docs/loki/latest/setup/install/
- Grafana Loki Docker install documentation: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki local install documentation: https://grafana.com/docs/loki/latest/setup/install/local/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki Promtail scraping documentation: https://grafana.com/docs/loki/latest/clients/promtail/scraping/
- Grafana Loki Promtail timestamp stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/timestamp/
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/loki
- Podman run documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman logs documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html

## Issues Found
- Promtail was described as the recommended Loki collector. Grafana's documentation marks Promtail as deprecated, with LTS through February 28, 2026 and EOL on March 2, 2026, so the post now describes Promtail approaches as suitable for existing deployments and recommends Fluent Bit or Grafana Alloy for new deployments.
- The Promtail file-tailing config used `http://loki:3100` while the Promtail container was run with `--network host`. That hostname is not available in host networking, so the client URL was changed to `http://localhost:3100/loki/api/v1/push`.
- The direct Loki API script built JSON with string interpolation and only escaped double quotes, which could produce invalid JSON for normal log content. The script now uses `jq -nc` to generate valid JSON and sends it with `--data-binary @-`.
- The Fluent Bit example created `/etc/fluent-bit/loki.conf` but did not create the directory or tell the container to load that config. The commands now create the directory and pass `-c /fluent-bit/etc/loki.conf`.
- The LogQL count query used invalid grouping syntax: `count_over_time(... ) by (container)`. It was changed to the valid aggregation form `sum by (container) (count_over_time(...))`.
- The Loki container image was changed from `grafana/loki:latest` to `grafana/loki:3.7.0` to avoid a moving target in a command intended for reproducible testing.

## Review Notes
Podman was not installed in the review workspace, so the container commands could not be executed end-to-end locally. The review was completed against current official documentation. The Promtail snippets remain technically useful for legacy installations, but future revisions should consider replacing them with a Grafana Alloy example because Promtail is past EOL as of the validation date.
