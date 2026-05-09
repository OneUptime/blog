# Validation Summary: How to Troubleshoot Changing Calico Block Size

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

## Sources Consulted
- Calico Open Source documentation: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico Open Source documentation: IP pool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: calicoctl IPAM command overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source documentation: calicoctl ipam show reference - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam check reference - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl output and pod listing behavior - https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The IPPool example set both `ipipMode` and `vxlanMode`. Calico's IPPool reference says these fields cannot be set at the same time, so I removed `vxlanMode: Never` and left `ipipMode: Never`.
- The guide did not state that `blockSize` can only be set when an IPPool is created. I added a short note before the configuration snippet to prevent readers from trying to edit the field on an existing pool.
- The verification command used `awk '{print $8}'`, which prints the `NODE` column from `kubectl get pods -A -o wide`, not the pod IP column. I changed it to `awk '{print $7}'`.
- The verification command used `calicoctl ipam check`, which checks IPAM datastore consistency against Kubernetes but does not show pool block allocations. I changed it to `calicoctl ipam show --show-blocks`, which is documented for validating pool and block usage after a block-size change.

## Review Notes
The post remains a compact troubleshooting checklist. A future revision could include the full official migration sequence for changing an existing pool's block size: create a temporary pool, disable the old pool, recycle pods, delete and recreate the pool with the new block size, then migrate pods back.
