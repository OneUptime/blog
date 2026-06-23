# Validation Summary: How to Use MetalLB with Cilium for eBPF-Based Load Balancing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MetalLB
- Cilium
- eBPF
- Kubernetes Services
- Helm
- BGP
- Layer 2 ARP/NDP announcements
- Hubble
- XDP

## Sources Consulted
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Command Cheatsheet and command reference: https://docs.cilium.io/en/stable/cheatsheet/ and https://docs.cilium.io/en/stable/cmdref/
- Cilium LoadBalancer IPAM documentation: https://docs.cilium.io/en/stable/network/lb-ipam/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB advanced BGP configuration documentation: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/

## Issues Found
- The post said kube-proxy replacement would be disabled while the configuration set `kubeProxyReplacement: true`. Updated the explanation to match the required Cilium eBPF service load-balancing configuration.
- The Cilium install example used the outdated `1.15.0` chart version. Updated it to `1.19.5`, matching the current stable documentation consulted during review.
- The Cilium DSR example omitted the native routing and DSR dispatch settings required by the documented DSR mode. Added `routingMode: "native"` and `loadBalancer.dsrDispatch: "opt"`.
- The post implied Cilium BGP should be enabled when MetalLB uses BGP. Clarified that Cilium BGP remains disabled because MetalLB handles BGP announcements in this integration.
- The MetalLB Helm repository URL used the old `https://metallb.universe.tf` chart repo. Updated it to the official `https://metallb.github.io/metallb` repository.
- The MetalLB BGPAdvertisement `communities` example used object entries with `name` and `value`, but the API expects strings or aliases. Changed it to a string community value.
- The guide created a disabled `CiliumLoadBalancerIPPool` as an informational MetalLB integration object. Removed that pattern and clarified that `CiliumLoadBalancerIPPool` is for Cilium LB IPAM, while MetalLB owns allocation in this guide.
- The Cilium ConfigMap patch used generated config keys directly and included misleading external-IP wording. Replaced it with a Helm upgrade example using documented Helm values.
- The MetalLB static IP annotation used `metallb.universe.tf/loadBalancerIPs`. Updated it to the current `metallb.io/loadBalancerIPs` annotation.
- Several in-pod Cilium inspection commands used `cilium` instead of the documented `cilium-dbg` binary. Updated service, BPF LB, Maglev, status, and map inspection commands.
- The XDP acceleration example used an unsupported runtime `cilium config set` pattern. Replaced it with a Helm upgrade using `loadBalancer.acceleration=native`.
- The health-check section claimed Cilium performs configurable backend health checks. Reworded it to describe Kubernetes endpoint state and policy allowance for health traffic.
- The performance table used unsupported fixed 10x benchmark values. Replaced it with qualitative, configuration-dependent comparisons.
- The best-practice wording around `externalTrafficPolicy: Local` overclaimed client IP preservation in the Cilium DSR context. Reworded it to focus on Kubernetes `Local` traffic semantics and MetalLB endpoint-local announcements.

## Review Notes
The integration pattern is technically valid: MetalLB can allocate and announce LoadBalancer IPs while Cilium kube-proxy replacement handles the service datapath. Actual production behavior depends on the Cilium version, Linux kernel, NIC driver support for XDP, routing mode, and whether the network supports the selected DSR dispatch mode.
