# Validation Summary: How to Optimize Node CIDR Planning in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+) CNI plugin
- Calico IPAM (IP Address Management)
- Kubernetes networking (Pod CIDR, node IP allocation)
- `calicoctl` CLI
- CIDR / subnetting (RFC 1918, RFC 6598 CGNAT space)
- Bash scripting for capacity planning
- Mermaid diagrams

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- RFC 1918 (private address ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- RFC 6598 (100.64.0.0/10 CGNAT shared address space)
- Standard CIDR/subnetting math for validation of IP counts and supernet alignment

## Issues Found
- **Step 4 supernet CIDR was incorrectly aligned.** The comment originally read "Each uses a different /16 in the 10.244.0.0/13 supernet." A /13 starting at 10.244.0.0 is not a properly aligned CIDR — it would normalize to 10.240.0.0/13. The minimum supernet that exactly contains the four listed /16 blocks (10.244.0.0/16, 10.245.0.0/16, 10.246.0.0/16, 10.247.0.0/16) is 10.244.0.0/14 (covers 10.244.0.0 – 10.247.255.255 and is correctly aligned on the /14 boundary). Changed `/13` to `/14`.

## Review Notes
- The bash capacity-planning script in Step 1 is mathematically correct: with the example inputs (200 nodes, 110 pods/node, /26 blocks, 2× growth), it correctly identifies /16 as the smallest pool that fits the required 51,200 IPs.
- Step 3 IPPool YAML uses valid `projectcalico.org/v3` schema. All listed fields (`cidr`, `blockSize`, `ipipMode`, `natOutgoing`, `disabled`) are valid; `blockSize: 24` is within the allowed 20–32 range for IPv4 and `ipipMode: Never` is a valid value.
- The `calicoctl ipam show --show-blocks` flag is valid per current Tigera docs.
- The example in Step 3 (a /15 pool with /24 block size for a 200-node cluster) is intentionally over-provisioned relative to the Step 1 calculation, which is reasonable for the demonstrated growth-headroom goal — this is a stylistic choice, not an error.
- Note that for purely worker-node pod IPs, 110 pods/node fits in a /25 (128 IPs); using a /24 block (256 IPs) is generous but valid and the post calls this out as headroom.
- RFC 1918 commentary, CGNAT (100.64.0.0/10) callout, and total IP counts (/16 = 65,536, /14 = 262,144, /10 ≈ 4M) are all accurate.
