# Validation Summary: How to Enable Workers on Control Plane Nodes in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (control plane, taints, node affinity)
- talosctl CLI (gen config, patch machineconfig, etcd status)
- kubectl CLI (describe, get, top, drain)
- Kubernetes PriorityClass API
- kubelet resource reservation flags (system-reserved, kube-reserved, eviction-hard)
- JSON Patch (RFC 6902) syntax for Talos config patches
- Flannel CNI

## Sources Consulted
- Talos Linux configuration reference: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/ (specifically the `cluster.allowSchedulingOnControlPlanes` field)
- Talos talosctl CLI reference: https://www.talos.dev/v1.7/reference/cli/ (gen config, patch machineconfig, etcd status)
- Kubernetes documentation on taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes node-role labels/taints: `node-role.kubernetes.io/control-plane` (replaced the deprecated `master` label/taint in K8s 1.24+)
- Kubernetes PriorityClass docs: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes node affinity docs: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubelet reference for `system-reserved`, `kube-reserved`, and `eviction-hard` flags: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- kubectl drain reference (--delete-emptydir-data replaced the deprecated --delete-local-data in 1.20)

## Issues Found
1. **Missing heading marker for "Resource Reservations" section** — The section "Resource Reservations" was missing the `##` markdown heading prefix, causing it to render as a plain paragraph rather than a section header (breaking the document's TOC/structure). Fixed by prefixing it with `## `.

No other technical inaccuracies were found:
- `cluster.allowSchedulingOnControlPlanes` is the correct Talos config field.
- The control-plane taint `node-role.kubernetes.io/control-plane:NoSchedule` is the correct current-day taint (the `master` taint was removed in K8s 1.25).
- `talosctl gen config ... --config-patch '<json>'` and `talosctl patch machineconfig --nodes ... --patch '<json>'` syntax is correct, including JSON Patch RFC 6902 operations (`add`, `replace`).
- `talosctl etcd status --nodes ...` is a valid command.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the correct, non-deprecated flag (replacing `--delete-local-data`).
- The `PriorityClass` example is valid: `system-critical` is not one of the reserved names (only `system-cluster-critical` and `system-node-critical` are reserved), and the value `1000000` falls within the user-allowed range (≤ 1,000,000,000).
- The `preferredDuringSchedulingIgnoredDuringExecution` node affinity snippet uses correct schema and `DoesNotExist` operator.

## Review Notes
- The kubelet flags `--system-reserved`, `--kube-reserved`, and `--eviction-hard` shown via `machine.kubelet.extraArgs` still work but are marked deprecated in modern kubelet versions in favor of the equivalent fields in `KubeletConfiguration`. In Talos, the more idiomatic modern approach is to use `machine.kubelet.extraConfig` with structured fields like `systemReserved`, `kubeReserved`, `evictionHard`. Functionally the post is correct, but a future revision could prefer `extraConfig` for forward compatibility.
- `kubectl get --raw /healthz?verbose` works in most shells but the `?` could be interpreted by some shells as a glob character; quoting the URL would be safer (`kubectl get --raw '/healthz?verbose'`). This is a minor robustness suggestion, not an error.
- The example uses arbitrary IPs (10.0.0.2–10.0.0.4) for three control plane nodes; readers should substitute their own.
