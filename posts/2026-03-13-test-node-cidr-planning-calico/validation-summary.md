# Validation Summary: Test Node CIDR Planning with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico IPAM
- calicoctl
- kubectl
- Python ipaddress and math modules
- CIDR planning

## Sources Consulted
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size documentation: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl IPAM overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show/
- Calico calicoctl configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Python ipaddress standard library documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The introduction described node CIDR planning as allocating the IPs assigned to nodes themselves. Kubernetes node CIDRs/PodCIDRs are pod address ranges assigned to nodes when node CIDR allocation is enabled, so the wording was corrected to distinguish PodCIDRs from host node IP ranges.
- The CIDR calculator subtracted 2 addresses from each Calico /26 block. Calico documentation describes the default IPv4 /26 block as 64 addresses and `calicoctl ipam show` reports the full block total, so the calculator now uses all 64 addresses for block-capacity planning.
- The staging workload comment said 500 replicas used approximately 50% of planned capacity, but 500 pods is less than 1% of a /16 pool and about 1.5% of the stated 33,000 maximum pod target. The comment was changed to describe it as sample IPAM allocation load.
- The boundary test comment said scaling to 800 replicas tested near 80% utilization, but 800 pods is far below 80% of a /16 pool. The wording was corrected to describe it as a higher pod-count allocation test, with replica count adjusted for cluster size and maxPods settings.
- The best-practice note said usable IPs per Calico block are slightly less than theoretical maximum. For Calico IPAM block capacity, the documented /26 block size is 64 addresses, so this was changed to emphasize whole-block allocation per host.

## Review Notes
The Calico IPPool fields shown in the YAML snippet (`cidr`, `blockSize`, `ipipMode`, `natOutgoing`, and `nodeSelector`) are valid for the `projectcalico.org/v3` IPPool resource. The `calicoctl ipam show --show-blocks` and `calicoctl ipam check` commands are documented in the current Calico Open Source reference. The post's use of `calicoctl` remains acceptable because Calico documentation still lists IPAM operations as requiring `calicoctl`.
