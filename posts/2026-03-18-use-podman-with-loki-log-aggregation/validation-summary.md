# Validation Summary: How to Use Podman with Loki for Log Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL
- Python `requests`
- YAML / Compose configuration

## Sources Consulted
- Grafana Loki local installation docs: https://grafana.com/docs/loki/latest/setup/install/local/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki storage docs: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Promtail installation docs and EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Loki guidance for Alloy as the recommended ingestion path: https://grafana.com/docs/loki/latest/send-data/alloy/
- Grafana Alloy Podman deployment docs: https://grafana.com/docs/alloy/latest/set-up/install/podman/
- Grafana Alloy `loki.source.journal` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.journal/
- Grafana Alloy `loki.source.file` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- Grafana Alloy `loki.process` reference: https://grafana.com/docs/alloy/latest/reference/components/loki.process/
- Grafana Alloy `loki.write` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Podman run docs for restart policy and log driver behavior: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman docs for rootless storage locations and host networking details: https://docs.podman.io/en/latest/markdown/podman-create.1.html and https://docs.podman.io/en/v4.7.2/markdown/podman.1.html

## Issues Found
- The post used Promtail as the primary collector even though Promtail reached end-of-life on March 2, 2026. I replaced the Promtail examples with Grafana Alloy because Grafana now recommends Alloy for sending logs to Loki.
- The standalone collector config pointed to `http://loki:3100` from a separate Podman container without establishing shared name resolution. I changed the example to run Alloy with `--network host` and push to `http://127.0.0.1:3100/loki/api/v1/push`, which matches the published Loki port.
- The original log collection example used `/var/log/containers/*.log`, which is a Kubernetes-style path and not Podman’s default logging location. I replaced the main collection path with journald-based collection, which matches Podman’s default `journald` log driver.
- The `ctr.log` parsing example treated Podman file logs as JSON. Podman’s `k8s-file`/`json-file` compatibility path uses CRI-formatted log lines, so I replaced that example with an Alloy `stage.cri {}` pipeline and clarified that it only applies when `k8s-file` is used.
- The retention section instructed readers to add a second `limits_config` block, which is not a safe YAML merge pattern. I changed it to show the resulting merged `limits_config` with `retention_period` added under the existing block.
- The Loki local configuration mixed filesystem settings in a way that did not match Grafana’s current local example. I aligned it with the current single-binary local filesystem example by keeping the `common.storage.filesystem` configuration and removing the conflicting extra filesystem block.
- The alerting section implied the rules file alone was sufficient. I clarified that the rules are an example for setups where Loki’s ruler is enabled and an Alertmanager URL is configured.

## Review Notes
- The examples still use `latest` image tags for readability. For repeatable production deployments, pin specific image versions.
- The file-based Podman log path differs between rootful and rootless Podman. The post now notes both behaviors, but readers still need to select the path that matches their deployment.
- No remaining technical issues found after the corrections above.
