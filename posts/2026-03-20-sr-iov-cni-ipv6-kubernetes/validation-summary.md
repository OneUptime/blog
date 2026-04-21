# Validation Summary: How to Configure SR-IOV CNI for IPv6 in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- SR-IOV
- SR-IOV CNI
- SR-IOV Network Device Plugin
- Multus / NetworkAttachmentDefinition
- Whereabouts IPAM
- IPv6
- Linux PCI SR-IOV sysfs configuration
- iperf3

## Sources Consulted
- Linux Kernel PCI Express I/O Virtualization Howto — https://docs.kernel.org/PCI/pci-iov-howto.html
- SR-IOV CNI official README — https://github.com/k8snetworkplumbingwg/sriov-cni
- SR-IOV Network Device Plugin official README — https://github.com/k8snetworkplumbingwg/sriov-network-device-plugin
- Whereabouts official README — https://github.com/k8snetworkplumbingwg/whereabouts
- Whereabouts extended configuration — https://github.com/k8snetworkplumbingwg/whereabouts/blob/master/doc/extended-configuration.md
- Multus CNI usage guide — https://k8snetworkplumbingwg.github.io/multus-cni/docs/how-to-use.html
- Kubernetes device plugin documentation — https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- RFC 4291: IP Version 6 Addressing Architecture — https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/info/rfc3849
- iperf3 documentation — https://software.es.net/iperf/invoking.html

## Issues Found

1. **Invalid IPv6 examples**: The post used `2001:db8:sriov::/64`, `2001:db8:sriov::1`, and `2001:db8:sriov::server`. These are not valid IPv6 literals because IPv6 hextets must be hexadecimal. Changed the examples to valid documentation-prefix addresses under `2001:db8:100::/64`.

2. **Missing Whereabouts installation**: The NetworkAttachmentDefinition used `"type": "whereabouts"` for IPAM, but the install step only installed SR-IOV CNI and the SR-IOV Device Plugin. Added the official Whereabouts daemonset and CRD install command, and updated the step heading.

3. **Outdated device-plugin selector style**: The SR-IOV Network Device Plugin still supports a single selector object, but its current documentation prefers `selectors` as a list of selector objects. Updated the ConfigMap example to use the preferred list form.

4. **Incorrect iperf3 latency wording**: The post described iperf3 as a latency test and claimed sub-microsecond latency. iperf3 is a throughput measurement tool, and sub-microsecond latency is not a generally valid expectation for this Kubernetes setup. Changed the wording to throughput validation and made the expected result conditional on NIC, NUMA, MTU, and CPU tuning.

5. **Overstated kernel-bypass claim**: The guide configures VFs bound to kernel networking drivers (`iavf` / `i40evf`) with IPAM-applied IPv6 addresses. That is direct VF networking, not DPDK kernel bypass. Updated the conclusion to describe high-throughput, low-overhead networking and note that DPDK-bound VFs require a separate userspace-driver configuration.

## Review Notes
- The Linux sysfs method for enabling VFs via `sriov_numvfs` is valid and matches the kernel documentation.
- The SR-IOV CNI NetworkAttachmentDefinition annotation `k8s.v1.cni.cncf.io/resourceName` matches the official SR-IOV CNI and Multus usage pattern.
- Kubernetes extended-resource requests for VFs are valid; device-plugin-managed resources are integer resources and cannot be overcommitted.
- The example applies manifests from `master` branches. That is acceptable for a tutorial, but production deployments should usually pin tested release versions.
- Whereabouts documents a wide-IPv6-CIDR caveat: for ranges of `/64` or wider, only the first `/65` is addressable. The example remains valid, but operators should account for this in capacity planning.
