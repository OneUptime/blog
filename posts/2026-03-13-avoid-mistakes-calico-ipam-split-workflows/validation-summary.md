# Validation Summary: Avoiding Mistakes in Calico IPAM Split Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes node labels
- Kubernetes workload endpoints

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool migration guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The post described creating active replacement sub-pools inside the original pool CIDR while keeping the original pool. Calico IPPool CIDRs cannot overlap: API server mode rejects overlapping pools, and native v3 CRDs mark overlapping pools disabled. I changed the example to use non-overlapping target pools and explicitly warned against overlapping IPPools.
- The post used `calicoctl ipam show --show-all-ips`, but `--show-all-ips` is an option for `calicoctl ipam check`, not `calicoctl ipam show`. I changed the command to `calicoctl ipam check --show-all-ips`.
- The post said deleting the source pool early removes allocation records. Official Calico guidance is that deleting an old pool too early can affect existing pods; the safer wording is about connectivity and pool metadata rather than claiming allocation records are removed. I updated that explanation.
- The deletion check used `calicoctl ipam show --show-blocks | grep "10.0.0.0/16"` and described looking for zero allocations. I changed the example to check workload endpoints for old-range addresses with `calicoctl get wep --all-namespaces`.
- The best-practice note claimed node relabeling triggers pod IP reallocation. Relabeling changes future pool selection but does not itself reassign IPs to already running pods. I changed the guidance to say deleting and recreating pods is what moves workloads to target pools.
- The fallback pool example used a CIDR without warning that it must be inside the Kubernetes pod CIDR and non-overlapping with existing IPPools. I updated the comment and example CIDR accordingly.

## Review Notes
Calico v3.32 documentation recommends using `kubectl` with the Calico API server for many resource operations in newer installs, but `calicoctl` remains required for IPAM subcommands. The post's `calicoctl` focus is still appropriate because it uses `calicoctl ipam`.
