# Validation Summary: How to Migrate to Changing Calico Block Size Safely

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

## Sources Consulted
- Calico documentation: Change IP pool block size: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl custom columns output: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The post implied that changing Calico block size could be handled by applying an IPPool manifest directly. Calico documents that `blockSize` can only be set when the IPPool is created, so I updated the introduction and steps to use the supported temporary-pool migration flow: create a non-overlapping temporary pool, disable the old pool, move pods, delete and recreate the original pool, disable the temporary pool, move pods back, and delete the temporary pool.
- The initial `calicoctl get ippools -o yaml` command used the plural resource form. Calico documentation consistently uses `ippool`, so I changed the command to `calicoctl get ippool -o yaml`.
- The migration commands referenced `temporary-pool.yaml` and `pool.yaml`, but the post only showed one generic IPPool example. I added both manifests and made the temporary pool use a non-overlapping CIDR.
- The IPPool example used a generic pool name and the default IPv4 block size, which did not demonstrate a block-size migration. I changed it to recreate `default-ipv4-ippool` with a different `blockSize` value.
- The IPPool example set both `ipipMode` and `vxlanMode`. Calico's IPPool reference says these modes cannot be set together, so I removed the redundant `vxlanMode: Never` field and left `ipipMode: Never`.
- The verification command `kubectl get pods -A -o wide | awk '{print $8}'` selected the node column, not the pod IP column, when namespaces are included. I replaced it with a `kubectl` custom-columns command that explicitly prints pod IPs and nodes.
- The verification section did not include the Calico command that confirms allocated block sizes. I added `calicoctl ipam show --show-blocks`, which is the documented way to inspect IPAM blocks.

## Review Notes
The migration commands are intentionally disruptive because moving pods between pools requires pod deletion and recreation. In production, workloads should be drained or restarted in a controlled order instead of deleting every pod at once.
