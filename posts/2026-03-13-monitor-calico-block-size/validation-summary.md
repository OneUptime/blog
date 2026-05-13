# Validation Summary: How to Monitor Changing Calico Block Size

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
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The post implied that `blockSize` could be configured as a normal change on an existing IPPool. Calico documents `blockSize` as a creation-time field that cannot be edited directly after installation. Added a short caveat that users must create a replacement pool and migrate workloads for existing pools.
- The verification command used `awk '{print $8}'` against `kubectl get pods -A -o wide`, which selects the node column rather than pod IPs in the standard wide pod output. Changed it to skip the header and print column 7, the pod IP column.

## Review Notes
The remaining Calico IPPool fields, `calicoctl ipam show --show-blocks`, and `calicoctl ipam check` are valid for current Calico documentation. Future improvements could show the full migration workflow for changing an existing pool's block size, but the post is now technically correct as a concise monitoring and validation guide.
