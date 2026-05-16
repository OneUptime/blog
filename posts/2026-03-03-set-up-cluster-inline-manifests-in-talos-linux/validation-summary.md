# Validation Summary: How to Set Up Cluster Inline Manifests in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (cluster machine configuration, `cluster.inlineManifests`, `cluster.extraManifests`)
- Kubernetes (Namespaces, RBAC, NetworkPolicy, StorageClass, ResourceQuota)
- Cilium CNI (HelmChart deployment, KubePrism integration)
- Rancher helm-controller (`helm.cattle.io/v1` HelmChart resource)
- `talosctl` CLI (`apply-config`, `dmesg`, `logs controller-runtime`)
- `kubectl` (verification and `--dry-run=server`)

## Sources Consulted
- Talos v1.9 Configuration Reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos KubePrism documentation: https://www.talos.dev/v1.6/kubernetes-guides/configuration/kubeprism/
- Sidero Labs — Deploying Cilium CNI: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Cilium kube-proxy-free documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- k3s helm-controller (Rancher): https://github.com/k3s-io/helm-controller
- Talos v1.9 CLI Reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos v1.9 Troubleshooting: https://docs.siderolabs.com/talos/v1.9/troubleshooting/troubleshooting
- Kubernetes documentation for NetworkPolicy, StorageClass, RBAC, and ResourceQuota

## Issues Found
No technical issues found.

All verified items:
- `cluster.inlineManifests` field structure (list of `name` + `contents`) is correct.
- `cluster.extraManifests` field for URL-based manifests is correct.
- Cilium `kubeProxyReplacement: true` (boolean) is correct for Cilium 1.14+ (string form was deprecated).
- KubePrism endpoint `localhost:7445` matches the documented Talos default.
- `helm.cattle.io/v1` is the correct API version for the Rancher helm-controller HelmChart CRD.
- `talosctl logs controller-runtime`, `talosctl dmesg --nodes`, and `talosctl apply-config --nodes --file` are all valid commands.
- The caveat that inline manifest changes are not automatically reapplied after the initial bootstrap is accurately stated.
- All example Kubernetes resources (NetworkPolicy default-deny, local-volume StorageClass, ClusterRole/Binding, ResourceQuota) are syntactically valid.

## Review Notes
- The post is broadly accurate without being tied to a single Talos version. Readers should note that KubePrism on `localhost:7445` is enabled by default starting in Talos v1.6 — on older versions the Cilium HelmChart snippet would need a different `k8sServiceHost`/`k8sServicePort` (e.g., the control-plane VIP).
- There is a known race condition (siderolabs/talos issue #9132) where Cilium agents can crashloop when started against KubePrism before it is fully ready. Not strictly a correctness issue with the post, but worth being aware of when troubleshooting deployments based on this example.
- The HelmChart example correctly notes the prerequisite that a Helm controller must be installed; users on stock Talos who do not install helm-controller will need to use the rendered Cilium YAML instead.
