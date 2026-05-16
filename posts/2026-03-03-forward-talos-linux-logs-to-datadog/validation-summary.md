# Validation Summary: How to Forward Talos Linux Logs to Datadog

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, machine.logging API)
- talosctl CLI
- Datadog (Agent, Helm chart, Log Explorer, Log Pipelines)
- Helm
- Kubernetes (DaemonSet, Deployment, Service, ConfigMap, Secret)
- Vector (socket source, remap transform, datadog_logs sink)
- containerd

## Sources Consulted
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos machine.logging configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos guide to editing machine configuration: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Datadog Helm chart values: https://github.com/DataDog/helm-charts/blob/main/charts/datadog/values.yaml
- Vector socket source docs: https://vector.dev/docs/reference/configuration/sources/socket/
- Vector datadog_logs sink docs: https://vector.dev/docs/reference/configuration/sinks/datadog_logs/

## Issues Found
1. **Incorrect talosctl command for applying a patch to a running node.** The post used `talosctl apply-config --nodes <ip> --patch @file.yaml`. The `apply-config` command requires `-f, --file` for a complete configuration file, and the patch flag is `-p, --config-patch` (not `--patch`). For applying a patch directly to a running node (without a base file), the correct command is `talosctl patch machineconfig` (aliased as `talosctl patch mc`). Changed both invocations in the "Configuring Machine Log Forwarding" section to `talosctl patch mc --nodes <ip> --patch @datadog-logging-patch.yaml`.

2. **Misleading comment on the kubelet Helm value.** The values file had `# Talos uses a non-standard kubelet path` next to `datadog.kubelet.host`, but that field is the kubelet host/IP, not a path. The reason this override is needed on Talos is that the agent must connect to kubelet by host IP rather than node name. Updated the comment to `# Talos requires connecting to the kubelet by host IP rather than node name` to accurately describe the setting.

## Review Notes
- The Talos `machine.logging.destinations` block (with `endpoint` and `format: json_lines`) matches the v1alpha1 schema. `tcp://` and `udp://` are both valid endpoint schemes.
- Datadog Helm chart keys used (`datadog.apiKeyExistingSecret`, `datadog.logs.enabled`, `datadog.logs.containerCollectAll`, `datadog.apm.portEnabled`, `datadog.processAgent.enabled`, `datadog.processAgent.processCollection`, `datadog.criSocketPath`, `datadog.kubelet.host`, `agents.tolerations`, `agents.volumes`, `agents.volumeMounts`) are all valid in the current chart.
- The containerd socket path on Talos is correctly `/run/containerd/containerd.sock`.
- Vector socket source's default framing for TCP mode is `newline_delimited`, so the configuration as written will correctly split incoming `json_lines` from Talos. Authors could optionally make this explicit by adding `framing.method = "newline_delimited"` for clarity, but it is not required.
- The note that Talos machine logs are emitted from the host network and therefore typically cannot reach an in-cluster `ClusterIP` is correctly highlighted; readers should plan for `NodePort`, `LoadBalancer`, or a host-network listener for the Vector forwarder.
- The Vector image tag `timberio/vector:0.34.1-distroless-libc` is pinned to a specific older release. As of the current date this still works, but readers may want to bump to a more recent Vector release for security fixes.
