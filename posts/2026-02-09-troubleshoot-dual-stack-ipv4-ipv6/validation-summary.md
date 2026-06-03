# Validation Summary: How to troubleshoot dual-stack IPv4/IPv6 networking problems

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes dual-stack networking
- Kubernetes Services
- Kubernetes DNS for Services and Pods
- kube-proxy
- Calico IPPool resources
- Cilium Kubernetes networking
- MetalLB LoadBalancer configuration
- Linux IPv6 sysctls
- IPVS
- tcpdump

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes cluster networking: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes feature gates: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico dual-stack / IPv6 IPAM guidance: https://docs.tigera.io/calico-cloud/networking/ipam/ipv6
- Cilium Kubernetes configuration reference: https://docs.cilium.io/en/latest/network/kubernetes/configuration/
- MetalLB configuration: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB troubleshooting: https://metallb.io/troubleshooting/
- ipvsadm man page: https://manpages.debian.org/trixie/ipvsadm/ipvsadm.8.en.html

## Issues Found
- The post stated that both pods and services receive IPv4 and IPv6 addresses in dual-stack mode. Kubernetes services are single-stack by default unless configured with `PreferDualStack` or `RequireDualStack`, so the wording was corrected.
- The feature-gate check used `kubeletConfigKey`, which is not a valid way to verify current Kubernetes dual-stack behavior. Updated this to note that dual-stack is stable and enabled by default in current releases, and to check node InternalIP reporting instead.
- The node address command used `.status.addresses[1]` as IPv6, which is order-dependent and can return the wrong address. Replaced it with a jsonpath command that lists all InternalIP values per node.
- The service `jsonpath` examples claimed JSON array output. `kubectl -o jsonpath` does not render those fields as JSON arrays, so the examples now use `kubectl -o json | jq`.
- The `curl` examples for direct Service IPs were made safer by quoting the URL and adding a trailing slash, especially for bracketed IPv6 literals.
- The kube-proxy configuration grep looked for `service-cluster-ip-range`, which is not a kube-proxy setting in current Kubernetes dual-stack configuration. Updated it to check `clusterCIDR` / `cluster-cidr`.
- The IPVS commands used invalid list syntax with `-t` and `-6`. Replaced them with `ipvsadm -L -n`; IPv6 virtual services are shown with bracketed IPv6 addresses.
- The "IPv6 Connectivity Works, IPv4 Does Not" section suggested reordering `.spec.ipFamilies` via patch. Kubernetes only allows adding or removing a secondary IP family; the primary family cannot be changed on an existing Service. Reworded the section to diagnose unexpected address-family ordering and advise recreating the Service if the primary family is wrong.

## Review Notes
- The examples assume Kubernetes versions where dual-stack is stable, which is appropriate for current clusters. Readers on Kubernetes versions before v1.23 should consult version-specific Kubernetes documentation.
- MetalLB dual-stack behavior depends on address-pool compatibility and deployment mode; the included CRD fields are current, but production configurations should verify that pools and advertisements match the installed MetalLB version and namespace.
