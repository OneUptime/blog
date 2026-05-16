# Validation Summary: How to Tune kubelet Performance on Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux machine configuration
- Kubernetes kubelet
- KubeletConfiguration v1beta1
- Kubernetes node resource reservation and eviction
- Kubernetes CPU Manager and Topology Manager
- Talos CLI (`talosctl`)
- Prometheus kubelet metrics

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes CPU Manager policy documentation: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes node-pressure eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The resource reservation example used deprecated kubelet command-line flags and enforced `system-reserved`/`kube-reserved` without configuring the required cgroup fields. Changed it to `extraConfig` with `systemReserved`, `kubeReserved`, and default `pods` enforcement.
- The `systemReserved` example included `ephemeral-storage`, but the current KubeletConfiguration reference only supports CPU and memory for `systemReserved`. Removed that unsupported resource from `systemReserved` while keeping `ephemeral-storage` under `kubeReserved`.
- The eviction threshold example used deprecated kubelet command-line flags. Changed it to KubeletConfiguration fields under `extraConfig` and added `mergeDefaultEvictionSettings: true` so unspecified default hard eviction thresholds are preserved.
- The CPU Manager example duplicated deprecated command-line flags and `extraConfig` fields for the same settings. Removed the deprecated flags and kept the KubeletConfiguration fields.
- The monitoring section described `talosctl read /var/lib/kubelet/config.yaml` as checking the metrics endpoint, but that command reads the rendered kubelet configuration. Updated the comment to match the command.
- The metrics list included `kubelet_node_config_error`, which is not present in the current Kubernetes metrics reference. Replaced it with `kubelet_runtime_operations_errors_total`.

## Review Notes
The remaining examples are version-sensitive because Talos ships a kubelet version tied to the configured Kubernetes release. The reviewed fields are present in the current Kubernetes KubeletConfiguration reference and the current Talos machine configuration reference.
