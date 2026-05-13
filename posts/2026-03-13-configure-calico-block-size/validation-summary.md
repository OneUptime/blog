# Validation Summary: How to Configure Changing Calico Block Size

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl
- kubectl

## Sources Consulted
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The post did not state that `spec.blockSize` can only be set when an IPPool is created. Added a short note before the configuration snippet explaining that changing an existing pool requires creating a replacement pool and migrating workloads.
- The verification command used `kubectl get pods -A -o wide | awk '{print $8}'`, which is fragile and commonly selects the node column rather than the pod IP column. Replaced it with `kubectl get pods -A -o custom-columns=IP:.status.podIP --no-headers | sort -u` to explicitly list pod IPs.

## Review Notes
The IPPool YAML uses valid `projectcalico.org/v3` fields, and the `calicoctl ipam show --show-blocks` and `calicoctl ipam check` commands match the official calicoctl references. The example uses `blockSize: 26`, which is the IPv4 default; a future improvement could use a non-default value if the goal is to visibly demonstrate a changed block size.
