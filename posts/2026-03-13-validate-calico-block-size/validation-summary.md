# Validation Summary: How to Validate Changing Calico Block Size

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
- Calico documentation: Change IP pool block size, https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The verification command used `awk '{print $8}'` with `kubectl get pods -A -o wide`, which prints the node column rather than the pod IP column. Changed it to `--no-headers | awk '{print $7}'` so it lists pod IPs.
- The configuration section did not mention that Calico IPPool `blockSize` can only be set when the pool is created. Added a short caveat to avoid implying that an existing pool's `blockSize` can be edited in place.

## Review Notes
The IPPool YAML fields and values are valid for Calico v3 API resources. `calicoctl ipam show --show-blocks` is the key command for confirming allocated block CIDRs after the change.
