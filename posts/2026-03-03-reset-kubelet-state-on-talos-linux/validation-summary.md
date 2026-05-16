# Validation Summary: How to Reset Kubelet State on Talos Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Talos Linux (talosctl CLI, machine configuration, EPHEMERAL partition)
- Kubernetes kubelet (state, certificates, configuration)
- kubectl (node draining, node/pod inspection)
- containerd (container runtime, image cache)
- Bash scripting (health-check and recovery automation)

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Talos reset / lifecycle management: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/lifecycle-management/resetting-a-machine
- Talos machine configuration (`machine.kubelet`): https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/
- Talos machine config patching: https://www.talos.dev/v1.9/talos-guides/configuration/patching/
- Talos editing machine configuration: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos 1.5+ image command rename (siderolabs/talos discussions): https://github.com/siderolabs/talos/discussions/7625
- Kubernetes kubelet docs: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/

## Issues Found

1. **Service status command used the singular `talosctl service <name>` form.** The documented status command is the plural form `talosctl services <name>`; the singular `talosctl service` is paired with action subcommands (`start`/`stop`/`restart`). Updated every status-check invocation (the standalone status checks in Methods 1 and 2, the containerd check under "Stuck Pods", the health-check script, and the recovery script) to use `talosctl services`.

2. **`talosctl images` no longer exists.** The bare `images` command was renamed/removed starting in Talos 1.5–1.6. Replaced `talosctl images --nodes 10.0.0.50` with `talosctl image list --namespace cri --nodes 10.0.0.50`, which is the current command for listing cached container images (the `cri` namespace is where kubelet-managed workload images live).

3. **`talosctl usage` was invoked without a path argument.** `talosctl usage` behaves like `du` and requires one or more path arguments — the bare form does not produce a node-wide disk summary. Updated the disk-usage check to `talosctl usage /var/lib/kubelet /var/lib/containerd --nodes 10.0.0.50`, which is the relevant data for diagnosing kubelet/containerd disk pressure.

## Review Notes

- `talosctl reset --system-labels-to-wipe EPHEMERAL` with `--graceful=true --reboot=true` is correct; `STATE`, `EPHEMERAL`, and `META` are valid partition labels for selective wipes.
- `machine.kubelet.extraConfig` and `machine.kubelet.extraArgs` are valid fields. The example values (`maxPods`, `serializeImagePulls`, `imageGCHighThresholdPercent`, `imageGCLowThresholdPercent`, `v`) all map to real kubelet configuration / flags.
- Patching `machine.kubelet` typically restarts kubelet in place without a full node reboot when applied in Talos's default auto mode, so the post's claim that "Kubelet will be restarted automatically with the new config" holds for the example shown. Other machine-config changes may require a reboot — readers patching outside of `machine.kubelet` should not assume the same behavior.
- `talosctl get kubeletconfig` is valid; the resource lives in the `k8s` namespace as `KubeletConfigs.kubernetes.talos.dev`.
- Talos mounts the EPHEMERAL partition at `/var`, so the claim that kubelet state lives under `/var/lib/kubelet/` on EPHEMERAL is accurate.
- `--follow` on `talosctl logs`, the kubectl drain/describe/get commands, and the jsonpath used in the recovery script are all valid.
