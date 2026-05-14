# Validation Summary: How to Avoid Common Mistakes with Calico IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- calicoctl
- Tigera Operator Installation resource

## Sources Consulted
- Calico documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: BlockAffinity resource - https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: Create multiple IP pools - https://docs.tigera.io/calico/latest/networking/ipam/ippools

## Issues Found
- The post used `kubectl get ipamhandles -A` for "View node block assignments." `IPAMHandle` resources track allocation handles, not node-to-block affinity. Changed the command to `kubectl get blockaffinities.crd.projectcalico.org` because Calico's `BlockAffinity` resource represents affinity for an IPAM block and includes the assigned node and CIDR.

## Review Notes
- The operator `Installation` IP pool example uses current fields and values for operator-managed default pools.
- `calicoctl ipam check -o ipam-report.json` and `calicoctl ipam check --show-all-ips` match the documented command syntax.
- The post correctly describes Calico IPAM blocks as defaulting to 64 addresses for IPv4 `/26` pools. For IPv6 pools, the documented default is `/122`.
