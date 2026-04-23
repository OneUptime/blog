# Validation Summary: How to Configure RKE2 Networking with Cilium - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- RKE2
- Kubernetes
- Cilium
- eBPF
- CNI plugins
- Hubble
- Cilium Network Policy
- Cilium Cluster Mesh
- HelmChartConfig

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Quick Start and cluster access notes: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- Cilium installation on RKE/RKE2: https://docs.cilium.io/en/stable/installation/k8s-install-rke/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Helm Reference and Cilium 1.19.3 chart values: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI flow inspection: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Cluster Mesh setup: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium troubleshooting and cilium-dbg usage: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command help output for `clustermesh connect`, `clustermesh enable`, and Hubble `observe`.

## Issues Found
- The post overstated that Cilium replaces iptables generally and bypasses the kernel networking stack. Updated the wording to describe kube-proxy iptables/IPVS replacement via eBPF when kube-proxy replacement is enabled.
- The prerequisites listed Linux kernel 5.4+ and described 4 GB RAM as a Cilium requirement. Updated this to current Cilium kernel guidance and RKE2's documented node memory minimum.
- The RKE2 bootstrap sequence disabled kube-proxy without ensuring the required Cilium Helm values were present first. Clarified that the `HelmChartConfig` must be placed in the RKE2 manifests directory before first start when `disable-kube-proxy` is used.
- The Cilium Helm values used deprecated or incorrect keys: `kubeProxyReplacement: "strict"` and `nativeRoutingCIDR`. Updated them to `kubeProxyReplacement: true`, `routingMode: "native"`, and `ipv4NativeRoutingCIDR`.
- The kube-proxy replacement API endpoint used a placeholder load balancer IP. Updated it to RKE2's documented local API endpoint values, `k8sServiceHost: "localhost"` and `k8sServicePort: "6443"`.
- The DSR example omitted the dispatch mode and did not explicitly enable native routing. Added `loadBalancer.dsrDispatch: "opt"` and native routing configuration consistent with Cilium's DSR examples.
- The RKE2 verification command assumed `kubectl` and the kubeconfig were already configured. Added the RKE2 kubeconfig and binary path exports.
- The Hubble and Cilium CLI install commands used older branch names and fixed amd64 archives without checksum verification. Updated them to current documented install patterns with `main`, architecture detection, `--fail`, and SHA256 checks.
- The Cluster Mesh example used the invalid `--source-context` flag. Replaced it with the inherited `--context` flag, added explicit contexts for both clusters, added `--wait`, and noted the required unique `cluster.name` and `cluster.id` values.
- The Cilium pod exec examples used `cilium status` and `cilium service list` inside the agent pod. Updated them to the current in-pod debug binary, `cilium-dbg status` and `cilium-dbg service list`.

## Review Notes
RKE2's integrated `rke2-cilium` chart follows RKE2 release streams, so operators should still verify the exact bundled chart values for their RKE2 version. Native routing, DSR, and `autoDirectNodeRoutes` require the underlying network to route the relevant PodCIDRs; environments that drop IP options may need Geneve DSR dispatch instead of `opt`.
