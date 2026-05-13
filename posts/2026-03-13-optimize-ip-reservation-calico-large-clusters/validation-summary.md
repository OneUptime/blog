# Validation Summary: How to Optimize IP Reservation in Calico for Large Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.22+)
- Calico IPAM
- Calico IPReservation resource
- calicoctl CLI
- Kubernetes (Pod annotations, CNI)
- Mermaid (diagram)
- Python (one-liner for capacity math)

## Sources Consulted
- Calico IPReservation reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- calicoctl ipam overview (subcommands): https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico "Use a specific IP address" (CNI annotations): https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico release notes for v3.22 (IPReservation availability)

## Issues Found
1. **Non-existent `calicoctl ipam assign` command (Step 3).** The original verification step ran `calicoctl ipam assign --ip=10.244.0.1 --node=test-node`. `calicoctl ipam` only exposes `check`, `configure`, `release`, `show`, and `split` subcommands — there is no `assign`. Replaced the command with `calicoctl ipam show --ip=10.244.0.1` and added a clarifying note that `calicoctl ipam show` reports allocation state (in-use/handle), not direct IPReservation membership, so the operator must cross-reference with the IPReservation manifests.
2. **Inaccurate capacity math (Step 4).** The Python snippet computed `reserved = 512 + 256` and labeled it "Infrastructure + monitoring reservations", but the infrastructure manifest in Step 2 reserves `10.244.0.0/28` (16) + `10.244.255.240/28` (16) + `10.244.100.0/24` (256) = 288 IPs, and the monitoring manifest reserves `10.244.101.0/25` (128) + `10.244.101.128/25` (128) = 256 IPs. Updated to `reserved = 288 + 256` with the breakdown in the comment, and bumped the percent format to `:.2f` so the small overhead (~0.83%) is not displayed as `0.8%` losing a meaningful digit.
3. **Misleading comment on `10.244.0.0/28` (Step 2).** Original comment read "Reserve first 16 IPs in each /28 for gateways", which is nonsensical because a /28 already contains 16 IPs and the CIDR reserves only one /28 (the first 16 IPs of the pool). Reworded to "Reserve first 16 IPs of the pool for gateways."

## Review Notes
- `cni.projectcalico.org/ipAddrs` is the correct Calico CNI annotation for requesting a specific pod IP, and the JSON-array-as-string format (`'["10.244.200.1"]'`) is correct per Tigera docs.
- The IPReservation resource (`apiVersion: projectcalico.org/v3`, `kind: IPReservation`, `spec.reservedCIDRs`) is accurate for v3.22 and later.
- One subtle caveat the post does not mention: IPReservation prevents Calico IPAM from auto-assigning a reserved IP, but using the `cni.projectcalico.org/ipAddrs` annotation to request a *reserved* IP is a documented "use case" (reserving stable IPs for specific pods) — operators should be aware that whether the explicit request succeeds depends on the Calico version's IPAM behavior toward reserved addresses. The post's Step 5 workflow is consistent with Tigera's intended usage pattern for stable pod IPs.
- `calicoctl ipam show --show-blocks` and `calicoctl ipam show --ip=<IP>` are both valid flags.
- The Best Practices guidance ("create reservations before workloads to avoid race conditions", "review quarterly") is operationally sound and consistent with the IPAM lifecycle.
