# Validation Summary: How to Configure Kubelet Settings via Machine Config Patches

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration v1alpha1)
- talosctl CLI
- Kubernetes kubelet (KubeletConfiguration API, kubelet CLI flags)
- kubectl
- Node labels, taints, and affinity primitives
- Kubelet resource management (system-reserved, kube-reserved, eviction thresholds)
- Kubelet feature areas: CPU Manager, Topology Manager, Memory Manager
- OCI mount specification (for extraMounts)

## Sources Consulted
- Talos v1alpha1 machine config reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Kubelet CLI flags reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- KubeletConfiguration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Memory Manager docs: https://kubernetes.io/docs/tasks/administer-cluster/memory-manager/
- Kubernetes CPU Manager / Topology Manager docs

## Issues Found

1. **`nodeLabels` and `nodeTaints` placement (critical)** — The original post placed `nodeLabels` and `nodeTaints` under `machine.kubelet`. In the Talos v1alpha1 schema these are top-level `machine` fields, not nested inside `machine.kubelet`. Applying the original YAML would fail validation in Talos. Fixed in all affected places:
   - The "full structure" overview block
   - The `node-labels-patch.yaml` example
   - The `node-taints-patch.yaml` example
   - The Control Plane role patch
   - The General Workers role patch
   - The GPU Workers role patch
   - The Storage Workers role patch
   Also added an explicit note in the overview paragraph clarifying that these two fields are top-level `machine` fields.

## Review Notes

- **Deprecated kubelet flags in `extraArgs`**: Most of the kubelet flags shown in the post (`max-pods`, `event-qps`, `event-burst`, `system-reserved`, `kube-reserved`, `eviction-hard`, `eviction-soft`, `serialize-image-pulls`, `image-gc-*`, `protect-kernel-defaults`, `rotate-server-certificates`, etc.) are upstream-deprecated and Kubernetes recommends configuring them through the KubeletConfiguration file (which Talos exposes via `extraConfig`). They still work today, so the post is not incorrect, but readers building new clusters would be better served by `extraConfig` equivalents (`maxPods`, `systemReserved`, `kubeReserved`, `evictionHard`, etc.). Not changed — would broaden the post scope.
- **`enforce-node-allocatable` caveat**: When enforcing `system-reserved` and `kube-reserved`, kubelet also requires `--system-reserved-cgroup` and `--kube-reserved-cgroup` to be set (and the corresponding cgroups to exist) for enforcement to actually take effect. The post doesn't mention this; not strictly an error, but worth noting for readers.
- **Capitalization sensitivity in `extraConfig`**: `cpuManagerPolicy: static` (lowercase) and `memoryManagerPolicy: Static` (PascalCase) differ — the post gets both right, but it is a footgun worth being aware of.
- **Kubelet image version `v1.29.0`** is a valid tag in `ghcr.io/siderolabs/kubelet`, though Talos v1.9 ships newer defaults (around v1.32). Left unchanged — used only as an illustrative example.
- **`node-role.kubernetes.io/control-plane` label**: Kubernetes restricts who may set `node-role.kubernetes.io/*` labels via the kubelet (NodeRestriction admission), but Talos applies machine-level `nodeLabels` through its own controller, so this works in practice for Talos clusters.
- All talosctl commands (`apply-config --mode no-reboot`, `service kubelet`, `logs kubelet --tail 100`) verified valid against the v1.9 CLI reference.
- The `extraMounts` OCI mount format (`destination`/`type`/`source`/`options`) is correct.
- Taint syntax `<key>: "<value>:<effect>"` is correct for Talos `nodeTaints`.
