# Validation Summary: How to Migrate to Migrating Calico IP Pools Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes workloads and kubectl

## Sources Consulted
- Calico Open Source 3.32 documentation: Migrate from one IP pool to another - https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Open Source 3.32 documentation: IP pool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: `calicoctl patch` - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source 3.32 documentation: `calicoctl ipam show` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source 3.32 documentation: `calicoctl ipam check` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: `kubectl rollout restart` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The post described safe Calico IP pool migration but only showed inspection commands and a generic IPPool manifest. Updated the existing configuration, example, verification, and conclusion text to match Calico's documented migration order: add the new pool, disable the old pool, restart/delete workloads so replacement pods receive new addresses, verify, and then delete the old pool.
- The IPPool example omitted `disabled: false`, which is the documented default but important in a migration example because disabling the old pool is the key migration step. Added it to make the intended allocation state explicit.

## Review Notes
- The original `calicoctl get ippools -o yaml`, `calicoctl ipam show --show-blocks`, and `calicoctl ipam check -o ipam-report.json` commands are valid according to current Calico documentation.
- Calico documentation notes that disabling an IP pool only prevents new IP allocations; it does not affect networking for existing pods. Workload restarts or pod deletions are therefore required to move pods to the new pool.
- Calico recommends keeping pool CIDRs within the Kubernetes cluster CIDR, and kube-proxy cluster CIDR settings should include the new pool CIDR where configured.
