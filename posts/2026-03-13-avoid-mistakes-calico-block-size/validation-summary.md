# Validation Summary: How to Avoid Common Mistakes with Changing Calico Block Size

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes kubectl

## Sources Consulted
- Calico documentation: Change IP pool block size, https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico IPPool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl ipam show reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubectl get reference, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get

## Issues Found
- The post implied that changing block size can be done by applying an IPPool manifest to the existing pool. Calico documents that `blockSize` can only be set when an IPPool is created, and changing block size after installation requires creating replacement pools and migrating workloads. I added a short warning before the IPPool manifest.
- The verification command used `awk '{print $8}'` with `kubectl get pods -A -o wide`, which selects the NODE column. In all-namespaces pod output, the IP column is field 7. I changed it to `awk '{print $7}'`.

## Review Notes
The IPPool fields shown in the manifest, `calicoctl ipam show --show-blocks`, and `calicoctl ipam check` are valid against current Calico documentation. The guide remains compact; a future expansion could include the full ordered migration workflow from the Calico block size documentation.
