# Validation Summary: How to Configure Calico on Windows Nodes for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Calico for Windows
- Kubernetes Windows nodes
- Kubernetes node labels and pod scheduling
- Calico IPPool, IPAM, FelixConfiguration, and calicoctl
- Windows HNS networking

## Sources Consulted
- Calico for Windows quickstart: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/quickstart
- Calico for Windows operator install: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes node labels populated by kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes well-known labels and annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/

## Issues Found
- The post stated that Windows nodes require VXLAN and not BGP-native routing. Calico for Windows supports VXLAN and non-overlay BGP with limitations, while IP-in-IP is unsupported. Updated the wording to make clear that this guide covers the VXLAN-based installation path.
- The `projectcalico.org/v3` `IPPool` examples used `encapsulation: VXLAN`, which is an operator `Installation` API field, not an IPPool field. Replaced it with `ipipMode: Never` and `vxlanMode: Always` in all IPPool examples.
- The post omitted Calico IPAM strict affinity, which official Calico for Windows guidance requires when using Calico IPAM so Linux nodes do not borrow addresses from Windows nodes. Added the `kubectl patch ipamconfigurations default` command.
- The node-label command could fail on nodes where `kubernetes.io/os` is already present, which kubelet normally sets. Added `--overwrite` to make the command idempotent.
- The Felix section said the example disabled Linux-only features, but the command only configures logging and Prometheus metrics. Reworded the section to describe what the command actually does and to caution against enabling Linux-only features such as eBPF or XDP for Windows nodes.
- The limitations text inaccurately implied unavailable GlobalNetworkPolicy features. Replaced it with specific documented limitations: no host endpoints, no application layer policy, and no eBPF on Windows.
- The Windows test pod used the older `nanoserver:1809` image tag. Updated the example to use `servercore:ltsc2022`, which is more appropriate for current Windows Server 2022-based clusters.
- The prerequisites mentioned only the Windows installation script. Updated them to include the operator path, which current Calico documentation recommends for Windows installation.

## Review Notes
- `kubectl` and `calicoctl` were not installed in the local environment, so CLI syntax was verified against official Kubernetes and Calico command references rather than local `--help` output.
- Windows container image tags must match the Windows node OS version. The updated example uses `ltsc2022`; clusters using a different supported Windows Server version should use a matching image tag.
