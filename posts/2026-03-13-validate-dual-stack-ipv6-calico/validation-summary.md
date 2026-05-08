# Validation Summary: How to Validate Dual-Stack IPv6 with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- IPv6
- Dual-stack networking
- Calico IPPool
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure dual stack or IPv6 only - https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Calico IPAM overview - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico Enterprise documentation: calicoctl ipam check - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Kubernetes documentation: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes documentation: Validate IPv4/IPv6 dual-stack - https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes documentation: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The example IPPool configuration only defined an IPv4 pool, so it did not validate or represent dual-stack Calico pod networking. Added a second IPv6 IPPool document using a ULA IPv6 CIDR and kept the existing Calico IPPool API shape.
- The prerequisites omitted Kubernetes dual-stack pod and service CIDR configuration, which is required for Kubernetes dual-stack clusters. Added that prerequisite.
- The verification command `kubectl get svc -A` did not show whether pods had both IPv4 and IPv6 addresses. Replaced it with JSONPath commands that print pod `.status.podIPs` and service `.spec.ipFamilies` / `.spec.clusterIPs`.
- The `calicoctl ipam check` command is documented for Calico Enterprise, while current Calico Open Source IPAM documentation lists `show`, `release`, and `configure`. Replaced it with `calicoctl ipam show --show-blocks` to inspect pool and block usage with a generally documented IPAM command.
- The architecture diagram incorrectly showed Calico IPPool allocating Service IPs. Calico IPPools are used by Calico IPAM for pod/workload IP allocation, while Kubernetes Services use service cluster IP ranges. Updated the diagram to show IPv4 and IPv6 pools assigning pod addresses and a dual-stack Service targeting the pod.

## Review Notes
The guide is technically relevant and now aligns with current Calico and Kubernetes dual-stack documentation. The post remains a compact validation checklist rather than a full cluster setup guide; future improvements could add explicit test workload creation and IPv4/IPv6 `kubectl exec` connectivity checks.
