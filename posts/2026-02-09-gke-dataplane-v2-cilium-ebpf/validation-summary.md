# Validation Summary: How to Enable GKE Dataplane V2 with Cilium for eBPF-Based Networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine
- GKE Dataplane V2
- Cilium
- eBPF
- Kubernetes NetworkPolicy
- GKE FQDNNetworkPolicy
- Hubble observability
- GKE inter-node transparent encryption
- Kubernetes Services and LoadBalancer traffic policy

## Sources Consulted
- Google Cloud documentation: GKE Dataplane V2 concepts, https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud documentation: Using GKE Dataplane V2, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Google Cloud documentation: Set up GKE Dataplane V2 observability, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/configure-dpv2-observability
- Google Cloud documentation: Observe your traffic using GKE Dataplane V2 observability, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/observe-your-traffic
- Google Cloud documentation: Control Pod egress traffic using FQDN network policies, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/fqdn-network-policies
- Google Cloud documentation: Encrypt your data in-transit in GKE with user-managed encryption keys, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/enable-inter-node-transparent-encryption
- Kubernetes documentation: Network policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Using source IP, https://kubernetes.io/docs/tutorials/services/source-ip/
- Cilium documentation: Command reference and cheatsheet, https://docs.cilium.io/en/stable/cmdref/ and https://docs.cilium.io/en/stable/cheatsheet/

## Issues Found
- The post described GKE Dataplane V2 as full upstream Cilium and used `CiliumNetworkPolicy` examples. GKE Dataplane V2 on current GKE versions does not support `CiliumNetworkPolicy`; replaced those examples with Kubernetes `NetworkPolicy` and GKE `FQDNNetworkPolicy`.
- The Layer 7 HTTP policy section used unsupported Cilium CRDs for GKE Dataplane V2. Reworked it as DNS-based egress policy using `FQDNNetworkPolicy`.
- The post used `cilium-xxxxx` pod names, but GKE Dataplane V2 runs the managed Cilium agent as `anetd` pods labeled `k8s-app=cilium`. Updated commands to use `anetd-xxxxx`.
- The Hubble section used upstream Cilium quick-install manifests and manual relay port-forwarding. GKE provides managed Dataplane V2 observability that must be enabled with `--enable-dataplane-v2-flow-observability`; updated the commands to use the managed Hubble CLI deployment.
- The service load balancing section claimed DSR and default Maglev behavior without GKE documentation support. Removed those claims and kept the documented eBPF/kube-proxy replacement behavior.
- The encryption section used `--enable-intra-node-visibility` as if it enabled WireGuard encryption. Replaced it with GKE inter-node transparent encryption using `--in-transit-encryption inter-node-transparent`, and noted the incompatibility with FQDN network policies.
- The troubleshooting section included an invalid in-agent `cilium connectivity test` command. Replaced it with a Cloud Logging query for `anetd` logs and retained relevant Cilium inspection commands.
- The performance section referenced a raw Kubernetes `perf-tests` URL that returns 404 and claimed a fixed 20-30% performance improvement. Replaced it with a simple `iperf3` benchmark example and a qualitative performance note.
- Replaced deprecated/legacy `--enable-stackdriver-kubernetes` usage with current logging and monitoring flags.

## Review Notes
The corrected post is technically accurate for current GKE behavior, but several commands still inspect managed Cilium internals. For production troubleshooting, Google Cloud Logging, GKE network policy logging, and GKE Dataplane V2 observability are more stable interfaces than relying on all Cilium CLI subcommands inside `anetd`.
