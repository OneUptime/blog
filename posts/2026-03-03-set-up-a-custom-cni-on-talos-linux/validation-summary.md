# Validation Summary: How to Set Up a Custom CNI on Talos Linux

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Talos Linux (talosctl machine configuration)
- Container Network Interface (CNI)
- Flannel (default Talos CNI)
- Cilium (eBPF-based CNI)
- Calico (with Tigera operator)
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Helm (Cilium installation)
- kubectl (verification and testing)

## Sources Consulted
- Talos Linux documentation: https://www.talos.dev/latest/kubernetes-guides/network/deploying-cilium/
- Talos Linux CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos Linux machine config reference (cluster.network.cni, cluster.proxy): https://www.talos.dev/latest/reference/configuration/
- Cilium Helm chart values reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium kube-proxy replacement docs: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Calico Tigera operator installation reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico releases (v3.27.0 manifest URL): https://github.com/projectcalico/calico/tree/v3.27.0/manifests
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- **Incorrect `talosctl` command for patching existing nodes.** The post used `talosctl apply-config --nodes ... --patch @file.yaml` in two places (the "Disabling the Default CNI" section and the "Configure Talos for Cilium" section). The `apply-config` subcommand requires `--file` and uses `-p/--config-patch` (not `--patch`) to apply patches on top of a base config file; it cannot be invoked with only a patch. The correct command for applying a patch to a live node's machine configuration is `talosctl patch mc --nodes ... --patch @file.yaml`. Both occurrences were updated to `talosctl patch mc`, matching the pattern used in the sibling blog post on `talosctl patch mc` and the official Talos CLI reference.

## Review Notes
- The Talos Cilium Helm values (kubeProxyReplacement, k8sServiceHost/Port, ipam.mode=kubernetes, cgroup.autoMount.enabled=false, cgroup.hostRoot, and the securityContext capabilities lists for ciliumAgent and cleanCiliumState) match the values published in the official Talos "Deploying Cilium" guide.
- `kubeProxyReplacement: true` is the modern (Cilium 1.14+) boolean form. Older Cilium versions used string values (`strict`/`disabled`/`partial`); the boolean form used in the post is correct for current releases.
- The Calico v3.27.0 manifest URL is valid and the Installation/APIServer CR shapes (calicoNetwork, ipPools, encapsulation: VXLANCrossSubnet, nodeAddressAutodetectionV4.firstFound, nodeSelector: all()) match the Tigera operator API.
- `cluster.proxy.disabled: true` and `cluster.network.cni.name: none` are correct Talos machine-config paths for disabling kube-proxy and the bundled CNI.
- `machine.network.kubespan.enabled: false` is the correct path; KubeSpan is opt-in and defaults to disabled, so this line is informational rather than required, but it is not incorrect.
- The Calico v3.27.0 manifest pin will age — readers running this much later may want to use a newer Calico release. No change made since the pinned version is technically valid and reproducible.
