# Validation Summary: Validating Calico IPAM Split Operations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes
- kubectl
- jq
- Bash

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam split` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/split
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The post claimed validation should prove no pods still use the original `10.0.0.0/16` CIDR, but the example child pools (`10.0.0.0/17` and `10.0.128.0/17`) cover that same address space. I changed this to validate that pod IPs are inside the expected split CIDRs and noted that matching `10.0.x.x` alone cannot identify an old parent-pool allocation.
- The post used `calicoctl get ... -o jsonpath=...`, but the official `calicoctl get` output formats include `yaml`, `json`, `wide`, `custom-columns`, `go-template`, and `go-template-file`, not Kubernetes-style `jsonpath`. I changed those examples to use `go-template`.
- The full checklist used `grep -q "consistent"` against `calicoctl ipam check` output, which can produce a false pass if output contains a word such as `inconsistent`. I changed the check to match `IPAM is consistent`.
- The post assumed the original parent pool must still exist and be disabled. The official split command describes splitting a pool into child pools, while the IPPool reference documents CIDR overlap validation. I changed the wording and checks so either a disabled original pool or a removed parent pool is handled, and warned not to leave an enabled overlapping parent pool.
- The node label section said every node must match exactly one selector, but the commands only checked that a `zone` label existed. I added a check for unexpected zone labels in the example's `zone-a` and `zone-b` setup.
- The test pods used `sleep 30`, which could complete before delayed image pulls, scheduling, or validation commands finish. I changed the sleep duration to `300` while preserving the cleanup step.

## Review Notes
- The example assumes a custom Kubernetes node label named `zone`; many clusters use standard topology labels such as `topology.kubernetes.io/zone`. The post is technically valid as an example, but readers should adapt selectors to their actual node labels.
- The CIDR validation script is written for single-stack IPv4 clusters using only the two example pools. Dual-stack clusters or clusters with additional pod CIDRs need corresponding adjustments.
