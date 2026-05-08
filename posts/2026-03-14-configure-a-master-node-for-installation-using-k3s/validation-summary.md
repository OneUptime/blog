# Validation Summary: Configuring a Master Node for Cilium Installation Using K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- K3s
- Helm
- Linux sysctl and eBPF/BPFFS configuration

## Sources Consulted
- Cilium K3s installation documentation: https://docs.cilium.io/en/stable/installation/k3s/
- Cilium Kubernetes without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium BPF reference guide: https://docs.cilium.io/en/stable/reference-guides/bpf/architecture/
- Cilium Helm chart repository and values for v1.19.3: https://helm.cilium.io/
- K3s server CLI documentation: https://docs.k3s.io/cli/server
- K3s networking services documentation: https://docs.k3s.io/networking/networking-services

## Issues Found
- The prerequisite kernel version was outdated. Cilium's current stable documentation requires Linux kernel 5.10+ or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel, so the prerequisite was updated.
- The sysctl example wrote to `/etc/sysctl.d/99-cilium.conf` without sudo despite listing sudo access as a prerequisite. The command now uses `sudo tee`.
- The BPF JIT comment incorrectly described `net.core.bpf_jit_enable` as increasing a limit. It now correctly says the setting enables the BPF JIT compiler.
- The BPFFS `/etc/fstab` example used `bpf` as the filesystem spec. Cilium documentation uses `bpffs`, so the example was corrected.
- The K3s install command enabled Cilium kube-proxy replacement but did not disable K3s kube-proxy. The command and flag explanation now include `--disable-kube-proxy`.
- The Cilium values used `127.0.0.1` for `k8sServiceHost`, which only works when every Cilium agent can reach the API server on local loopback. It now uses a master/API-server address placeholder that must be reachable from every node.
- The Helm install command pinned Cilium 1.16.5, which is outdated for a 2026 guide. It was updated to the current stable version checked during review, 1.19.3.
- The JSON patch used `replace` for the Cilium container resources path, which can fail if the field is absent. It now uses `add`, which also replaces the member if it already exists.

## Review Notes
- The Helm values used in the post were checked against the Cilium v1.19.3 chart and are valid keys.
- `bpf.tproxy: true` is valid, but it is a beta datapath option intended for Layer 7 policy handling rather than a master-node-specific requirement.
