# Validation Summary: Optimize Calico Networking on Google Compute Engine

## Status
validated

## Post Type
Tutorial / Optimization Guide

## Technologies Covered
- Project Calico (CNI for Kubernetes)
- Kubernetes
- Google Compute Engine (GCE) / Google Cloud VPC
- gcloud CLI
- Tigera Operator (Calico installation CRD)
- CoreDNS
- eBPF dataplane
- VXLAN / IP-in-IP encapsulation
- Felix configuration

## Sources Consulted
- Calico documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico eBPF dataplane requirements: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Google Cloud VPC MTU docs: https://cloud.google.com/vpc/docs/mtu
- Google Cloud per-VM Tier_1 networking: https://cloud.google.com/compute/docs/networking/configure-vm-with-high-bandwidth-configuration
- Google Cloud machine type bandwidth: https://cloud.google.com/compute/docs/network-bandwidth
- gcloud compute instances create reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- gcloud compute routes create reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- GCP internal DNS / metadata server: https://cloud.google.com/compute/docs/internal-dns

## Issues Found
- **Introduction MTU inconsistency**: The intro said "correctly sizing MTU for GCE's 1500-byte or jumbo frame networks" but the body (Optimization 5) and conclusion correctly state that GCE's default MTU is 1460 bytes. Updated the intro to read "1460-byte default or jumbo frame networks" so the post is internally consistent and matches Google's VPC documentation (default 1460, configurable to 1500 or 8896).

## Review Notes
- The IPPool YAML (apiVersion `projectcalico.org/v3`, fields `ipipMode`, `vxlanMode`, `natOutgoing`) is correct and current.
- `gcloud compute routes create` syntax and `--can-ip-forward` requirement for node instances forwarding pod traffic are accurate.
- `c3-standard-22` is the valid minimum size for enabling Tier_1 networking on the C3 family (per Google docs).
- The 100 Gbps bandwidth claim for `c3-standard-44` assumes Tier_1 networking is enabled — without Tier_1, the cap is lower. This is acceptable in context since Tier_1 is the next optimization discussed, but readers should know Tier_1 must be enabled to reach 100 Gbps.
- The kubectl patch using `installation default` / `linuxDataplane: BPF` is the correct Tigera Operator path for enabling eBPF.
- VXLAN overhead of 50 bytes (1460 - 50 = 1410 MTU) is correct for IPv4 VXLAN.
- The `forward . 169.254.169.254` snippet for CoreDNS is illustrative; in production you would typically scope it to specific zones (e.g., `google.internal:53 { forward . 169.254.169.254 }`) rather than forwarding all queries. Left as-is since the comment indicates intent ("for GCP internal names") and the post does not claim to be a complete CoreDNS Corefile.
- The "40-60% throughput improvement" figure in the mermaid diagram is at the upper end of commonly cited Calico eBPF benchmarks; results vary heavily by workload and policy complexity.
