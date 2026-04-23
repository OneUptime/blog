# Validation Summary: How to Configure RKE2 Networking with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Cilium
- eBPF
- Kubernetes CNI
- CiliumNetworkPolicy
- Hubble
- HelmChartConfig
- WireGuard
- kubectl

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Quick Installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Layer 7 Policies: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Service Map & Hubble UI: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium Inspecting Network Flows with the CLI: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium `hubble port-forward` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_hubble_port-forward/
- Cilium Hubble CLI repository: https://github.com/cilium/hubble

## Issues Found
- The RKE2 configuration used `kube-proxy-disabled: true`, which is not the current RKE2 config key. Changed it to `disable-kube-proxy: true` per the RKE2 server configuration reference.
- The Cilium Helm values used `kubeProxyReplacement: strict`, but current Cilium/RKE2 documentation uses `kubeProxyReplacement: true`; the Helm reference lists valid values as `true` or `false`. Updated the snippet and best-practices section.
- The Cilium kube-proxy replacement example pointed `k8sServiceHost` at `rke2.example.com` and left the port unquoted. Updated it to the RKE2-documented local API endpoint, `k8sServiceHost: "localhost"` and `k8sServicePort: "6443"`.
- The Hubble UI browser command used macOS `open` after installing the Linux Cilium CLI. Changed it to `xdg-open` for the Linux-oriented command block.
- The Hubble dropped-flow example used `--type drop`; the current Cilium Hubble CLI guide documents `--verdict DROPPED` for showing dropped flows. Updated the command and added `cilium hubble port-forward &` so the local Hubble CLI can reach Hubble Relay.
- The kernel requirement stated `4.9.17+` as the Cilium requirement. Updated the best-practice note to reflect current Cilium system requirements of kernel 5.10+ or an equivalent distribution kernel, and RKE2's recommendation for kernel 5.8+ before enabling Cilium kube-proxy replacement.
- The opening performance statement was too absolute about Cilium being faster than iptables-based CNIs. Reworded it to the more accurate claim that Cilium can reduce iptables-based service handling overhead.

## Review Notes
- The Cilium CLI install commands are functional, but the official docs also verify the downloaded tarball with a SHA256 checksum and choose `amd64` or `arm64` based on host architecture.
- The `hubble observe` command assumes the Hubble CLI is installed locally and can reach the Hubble API, or that it is run from an environment where those prerequisites are already satisfied.
