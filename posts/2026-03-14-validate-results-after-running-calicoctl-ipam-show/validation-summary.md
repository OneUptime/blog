# Validation Summary: Validating Results After Running calicoctl ipam show

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico Open Source calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- `kubectl delete pod ipam-test --grace-period=0` was incomplete for current kubectl behavior. Kubernetes documents that `--grace-period=0` can only be used when `--force` is true, so the cleanup command now includes `--force`.
- The block validation comment said to verify each node's block assignments using `calicoctl ipam show --show-blocks`. The official output shows pool and block usage, but not node ownership for each block in that table, so the comment now describes comparing allocated blocks with node count.

## Review Notes
The remaining `calicoctl ipam show`, `calicoctl ipam show --show-blocks`, and `calicoctl ipam check` examples match the current Calico Open Source documentation. `calicoctl ipam check` checks IPAM data structure integrity against Kubernetes, so it is a valid consistency check in Kubernetes clusters using Calico IPAM.
