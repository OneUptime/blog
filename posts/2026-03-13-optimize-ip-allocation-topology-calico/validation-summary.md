# Validation Summary: How to Optimize IP Address Allocation by Topology in Calico for Large Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Kubernetes
- calicoctl
- kubectl
- Calico IPAM (IP Pools, Block Allocator)

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found

1. **Invalid `vxlanMode` value in IPPool example.** The post had `vxlanMode: VXLAN`, which is not a valid value. Per Calico's IPPool spec, `vxlanMode` accepts only `Always`, `CrossSubnet`, or `Never`. Changed to `vxlanMode: Always` to enable VXLAN encapsulation, which is consistent with the `ipipMode: Never` already set (you typically choose one encapsulation type).

2. **Wrong awk column for pod IP.** The verification command used `awk '{print $8}'` on `kubectl get pods -A -o wide` output, but with `-A` the columns are `NAMESPACE($1) NAME($2) READY($3) STATUS($4) RESTARTS($5) AGE($6) IP($7) NODE($8)`. Column `$8` is the NODE name, not the pod IP. Changed to `$7` so the command actually returns pod IPs, matching the "Verify allocations" comment.

## Review Notes

- The post is titled "IP Address Allocation by Topology" but the example IPPool uses `nodeSelector: all()`, which is the opposite of a topology-aware configuration. A topology-aware example would typically use a `nodeSelector` keyed on a label like `topology.kubernetes.io/zone == 'us-east-1a'` to bind a pool to a specific zone. The commands shown are correct, but readers expecting a worked topology example will not find one. This is a content scope gap rather than a technical error.
- `blockSize: 26` is valid for an IPv4 pool (default; gives /26 blocks of 64 addresses each). Smaller `blockSize` values (larger blocks, e.g. /29) are sometimes preferred for topology-per-zone pools in large clusters to reduce block fragmentation across nodes — worth mentioning in a future revision.
- The flags `--show-blocks`, `--show-configuration`, and `calicoctl ipam check -o <file>` are all valid per current Calico documentation.
