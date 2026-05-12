# Validation Summary: Plan AWS VPC CNI Chaining with Cilium

## Status
validated

## Post Type
Tutorial / Planning Guide

## Technologies Covered
- Cilium (1.14.x)
- AWS VPC CNI
- Amazon EKS
- Kubernetes
- Helm
- eBPF
- Hubble
- CiliumNetworkPolicy / CiliumClusterwideNetworkPolicy

## Sources Consulted
- Cilium official documentation – CNI Chaining with AWS VPC CNI: https://docs.cilium.io/en/v1.14/installation/cni-chaining-aws-cni/
- Cilium Helm reference values: https://docs.cilium.io/en/v1.14/helm-reference/
- AWS VPC CNI plugin documentation: https://github.com/aws/amazon-vpc-cni-k8s
- AWS EKS user guide on alternate CNI plugins
- Cilium CLI reference: https://github.com/cilium/cilium-cli
- CNI specification (containernetworking/cni) regarding `.conf` vs `.conflist` formats

## Issues Found
1. **Incorrect CNI config filename extension.** In Cilium's chained CNI mode the file written under `/etc/cni/net.d/` is a plugin list (`.conflist`), not a single config (`.conf`), because CNI chaining requires a plugin list format per the CNI spec. Updated `cat /etc/cni/net.d/05-cilium.conf` to `cat /etc/cni/net.d/05-cilium.conflist` in Step 4.

## Review Notes
- The Helm install command in Step 3 matches the documented `aws-cni` chaining flags for Cilium 1.14 (`cni.chainingMode=aws-cni`, `cni.exclusive=false`, `enableIPv4Masquerade=false`, `routingMode=native`). The optional `ipv4NativeRoutingCIDR` is acceptable here and not harmful even though VPC CNI handles routing.
- For some workloads the official chaining guide also recommends `endpointRoutes.enabled=true`. This is not mandatory and the post is framed as a planning guide, so leaving it out is acceptable; readers may want to add it after testing.
- The `cilium connectivity test --test no-policies` filter is valid for Cilium CLI v0.15+ and runs the baseline connectivity tests without policy enforcement.
- Note on the architecture diagram: Hubble visibility in `aws-cni` chained mode is genuinely more limited than in native Cilium mode (loss of some L3/L4 detail and constraints around L7 visibility on pod-to-pod traffic that bypasses Cilium's datapath). The post accurately calls this out as "Limited Hubble visibility."
- Cilium 1.14 reached EOL in 2024-2025; readers in 2026 may want to use a current LTS (e.g., 1.16+). The post explicitly pins 1.14.0 for compatibility documentation purposes, which is fine for a planning reference but worth noting.
