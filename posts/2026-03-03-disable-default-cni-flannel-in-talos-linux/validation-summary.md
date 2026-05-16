# Validation Summary: How to Disable Default CNI (Flannel) in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes (kubectl, DaemonSets, CoreDNS, kube-proxy)
- Flannel CNI
- Cilium CNI (Helm install, kubeProxyReplacement)
- Calico CNI
- YAML / JSON Patch (RFC 6902) for config patches

## Sources Consulted
- Talos Linux configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos Cilium deployment guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos CLI reference (talosctl read/ls): https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos GitHub discussion on removing Flannel: https://github.com/siderolabs/talos/discussions/8037
- Flannel upstream manifests: https://github.com/flannel-io/flannel

## Issues Found
1. **Incorrect namespace for Talos's Flannel removal.** The post originally said `kubectl delete namespace kube-flannel`. Talos's bundled Flannel manifest deploys into the `kube-system` namespace (DaemonSet name `kube-flannel`, ConfigMap `kube-flannel-cfg`, ServiceAccount `flannel`), not into a `kube-flannel` namespace as the upstream Flannel manifests do. Replaced the command with explicit deletes of the DaemonSet, ConfigMap, ServiceAccount, ClusterRole, and ClusterRoleBinding scoped to `kube-system`. Confirmed via the Talos discussion at github.com/siderolabs/talos/discussions/8037.

2. **`talosctl read` used on a directory.** The post invoked `talosctl -n <node-ip> read /etc/cni/net.d/`. `talosctl read` reads a single file's contents and cannot enumerate a directory; the correct command for listing directory contents on a node is `talosctl ls`. Changed to `talosctl -n <node-ip> ls /etc/cni/net.d/`.

3. **Verification section also assumed wrong namespace.** Updated the verification step from `kubectl get pods -n kube-flannel` to `kubectl get daemonset -n kube-system kube-flannel` so the check actually exercises the resource Talos creates.

## Review Notes
- The `cluster.network.cni.name: none` setting is correct — Talos accepts `flannel`, `custom`, and `none` for this field.
- The `cluster.proxy.disabled: true` setting is correct for disabling the Talos-managed kube-proxy.
- The Cilium Helm install example is intentionally minimal ("for example, with Cilium") and omits Talos-specific values like `cgroup.autoMount.enabled=false`, `securityContext.capabilities.ciliumAgent`, and the helm repo add step. This is acceptable for an illustrative example; users following the linked Cilium-on-Talos guide will get the full command set. Worth noting as a future improvement.
- The JSON Patch examples (`{"op": "add", "path": "/cluster/network/cni", ...}`) and the `@file.yaml` syntax for `--config-patch-control-plane`/`--config-patch-worker` are both valid talosctl flag forms.
- The claim that "Flannel does not enforce Kubernetes NetworkPolicy resources" is accurate — Flannel is a CNI-only plugin with no built-in NetworkPolicy controller.
- The Kubernetes version shown in sample output (v1.29.0) is older than current; this is cosmetic and does not affect correctness of the procedure.
