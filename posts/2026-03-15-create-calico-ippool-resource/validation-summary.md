# Validation Summary: How to Create the Calico IPPool Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico IPPool resources
- Calico IPAM
- Kubernetes
- kubectl
- calicoctl
- VXLAN and IP-in-IP encapsulation
- IPv4 and IPv6 CIDR allocation

## Sources Consulted
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source create multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Open Source change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico Open Source IPv6 and dual-stack IPAM guide: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The introduction stated that pods cannot receive IP addresses without a properly configured IPPool. This is accurate for clusters using Calico IPAM, but too broad for all possible Calico CNI/IPAM configurations. Updated the wording to specify Calico IPAM and eligible enabled IPPools.

## Review Notes
- The IPPool API examples use valid `projectcalico.org/v3` fields and supported values for current Calico Open Source documentation.
- Calico documents that `ipipMode` and `vxlanMode` cannot both be enabled on the same IPPool. The examples avoid enabling both modes at once.
- `blockSize: 26` for IPv4 and `blockSize: 122` for IPv6 match the documented defaults and both provide 64 addresses per block.
- `calicoctl get ippools -o wide`, `calicoctl ipam show --show-blocks`, `kubectl run`, and `kubectl get ... -o jsonpath=...` are valid command patterns in the referenced documentation.
