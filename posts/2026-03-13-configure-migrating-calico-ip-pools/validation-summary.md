# Validation Summary: How to Configure Migrating Calico IP Pools

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl
- kubectl
- Mermaid

## Sources Consulted
- Calico documentation: Migrate from one IP pool to another, https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico documentation: IP pool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get

## Issues Found
- The description said migration could be done "without service disruption." Calico documents that existing pod connectivity is not affected when the migration sequence is followed, but deleting pods can still make applications temporarily unavailable depending on the workload. Changed the description to "without disrupting existing pod connectivity" to match the documented guarantee.

## Review Notes
The listed `calicoctl` commands and flags are valid in current Calico documentation. The `IPPool` YAML uses the current `projectcalico.org/v3` API and valid `cidr`, `blockSize`, and `natOutgoing` fields. The post is technically correct after the wording fix, but it is brief; a future improvement could show the full documented migration sequence: create the new pool, disable the old pool for new allocations, recreate pods, verify new pod IPs, then remove the old pool.
