# Validation Summary: How to Troubleshoot Logging Issues in Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes logging
- containerd CRI configuration
- Grafana Alloy and Loki
- Fluentd
- Vector

## Sources Consulted
- Talos Linux logging configuration documentation: https://www.talos.dev/latest/talos-guides/configuration/logging/
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux containerd configuration documentation: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/images-container-runtime/containerd
- containerd CRI configuration guide: https://containerd.io/docs/2.1/cri/config/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Grafana Promtail documentation and EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy loki.source.file documentation: https://grafana.com/docs/alloy/latest/reference/components/loki.source.file
- Vector buffer configuration documentation: https://vector.dev/docs/reference/configuration/sinks/vector/

## Issues Found
- The post used `talosctl ls`, but the current Talos CLI command is `talosctl list`. Updated the examples and checklist to use `talosctl list`.
- The post used `talosctl apply-config --patch` for patch files on running nodes. Current Talos documentation uses `talosctl patch machineconfig --patch @file` for live machine configuration patching, so the commands were updated.
- The containerd log-line-size snippet used the old Talos path `/var/cri/conf.d/20-max-log-line.toml` and the containerd 1.x CRI plugin table. Updated it to `/etc/cri/conf.d/20-customization.part` and `[plugins."io.containerd.cri.v1.runtime"]` for current Talos/containerd.
- The post recommended Promtail examples. Promtail reached EOL on March 2, 2026, so the examples were updated to use Grafana Alloy while keeping the surrounding collector troubleshooting guidance.
- The OOM event command filtered on `reason=OOMKilled`, which is not a dependable Kubernetes event reason. Updated it to inspect recent namespace events and match OOM text.

## Review Notes
The guide remains intentionally generic around collector manifests because exact labels, deployment names, and receiver commands vary by installation method. The examples now use supported current tools and Talos command syntax.
