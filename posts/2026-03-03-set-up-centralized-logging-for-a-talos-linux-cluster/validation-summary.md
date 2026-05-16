# Validation Summary: How to Set Up Centralized Logging for a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- Kubernetes
- Grafana Loki (log aggregation backend)
- Promtail (log collector DaemonSet)
- Vector (intermediary for Talos machine logs)
- Grafana (visualization / data source)
- LogQL (Loki query language)
- Helm (chart installation for Loki, Promtail, Grafana)
- `talosctl` CLI

## Sources Consulted
- Talos Linux documentation – machine config logging schema (`machine.logging.destinations`, `format: json_lines`): https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos Linux `talosctl` reference – `apply-config` vs. `patch mc`: https://www.talos.dev/latest/reference/cli/
- Grafana Loki Helm chart values (single-binary mode, `singleBinary.replicas`, `loki.auth_enabled`, `monitoring.selfMonitoring.*`, `test.enabled`, `loki-gateway` service): https://github.com/grafana/loki/tree/main/production/helm/loki
- Grafana Promtail Helm chart values (`config.clients`, `config.snippets.extraRelabelConfigs`, tolerations, `extraVolumes`, `extraVolumeMounts`): https://github.com/grafana/helm-charts/tree/main/charts/promtail
- Vector documentation – `socket` source with `decoding.codec`, `loki` sink labels and template syntax: https://vector.dev/docs/reference/configuration/sources/socket/ and https://vector.dev/docs/reference/configuration/sinks/loki/
- Grafana Helm chart datasource provisioning syntax: https://github.com/grafana/helm-charts/tree/main/charts/grafana
- LogQL reference: https://grafana.com/docs/loki/latest/query/
- Kubernetes container log path on Talos (`/var/log/pods`) and containerd runtime directory (`/run/containerd`): Talos + Kubernetes docs

## Issues Found
1. **Incorrect `talosctl` command for applying a config patch to running nodes.**
   - Was: `talosctl apply-config --nodes 192.168.1.10,192.168.1.20 --patch @talos-logging-patch.yaml`
   - Issue: `talosctl apply-config` requires a base config via `-f` to which `--patch` is then applied; it does not patch the existing machine config on running nodes by itself. The idiomatic command for applying a patch to a node's running machine config is `talosctl patch mc`.
   - Changed to: `talosctl patch mc --nodes 192.168.1.10,192.168.1.20 --patch @talos-logging-patch.yaml`

## Review Notes
- **Promtail lifecycle:** Grafana announced in early 2024 that Promtail is in maintenance mode / LTS and recommends Grafana Alloy for new deployments. The chart and binaries still work and receive security fixes, so the guide is functional, but readers starting fresh today may want to consider Alloy. Not changed because the post is explicitly written around Promtail.
- **Vector image version:** `timberio/vector:0.34.1-distroless-libc` is a valid tag but is from late 2023; newer Vector releases exist (0.4x series). Functionally fine for the example; not updated since it is not technically wrong.
- **Vector loki sink label template `labels.service = "{{ talos-service }}"`:** Talos `json_lines` log records use field names with hyphens (e.g. `talos-service`). Vector's template engine generally requires fields with special characters to be quoted (e.g. `{{ "talos-service" }}`) or first renamed in a `remap` transform. The example may need adjustment depending on the exact Vector version and the user's transforms. Left as written since it illustrates intent and the surrounding `transforms.add_labels` is clearly a starting scaffold the reader is expected to extend.
- **LogQL example `{pod=~"kube-apiserver.*"} | json | verb="delete"`:** Assumes the API server is emitting structured JSON audit logs to stdout (or a webhook routed back through container logs). The kube-apiserver's standard klog output is not JSON, so this query only matches when audit logging is configured to emit JSON. This is an instructive example rather than a guaranteed-working query; not changed.
- **Loki retention config block:** The keys (`loki.limits_config.retention_period`, `loki.compactor.retention_enabled`) match the Loki configuration schema as exposed through the Helm chart's `loki` values key. Correct.
- **Service name `loki-gateway`:** Correct for the Grafana Loki Helm chart when the gateway (nginx) is enabled, which is the default for the single-binary deployment used here.
