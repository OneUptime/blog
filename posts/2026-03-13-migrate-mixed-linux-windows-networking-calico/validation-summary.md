# Validation Summary: How to Migrate to Mixed Linux and Windows Networking with Calico Safely

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico for Windows
- Kubernetes mixed Linux/Windows clusters
- Windows Server containers
- Calico IPPool and IPAM configuration
- VXLAN and BGP networking
- kubectl
- PowerShell

## Sources Consulted
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico for Windows operator install: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico for Windows manual install: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Kubernetes Windows containers overview: https://kubernetes.io/docs/concepts/windows/intro/
- Calico v3.27.0 GitHub release: https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Microsoft announcement for open source Calico for Windows support in Calico v3.16: https://opensource.microsoft.com/blog/2020/09/22/calico-for-windows-goes-open-source/

## Issues Found
- The post said VXLAN mode is required for Windows. Calico supports VXLAN and non-overlay BGP for Windows, while IP-in-IP is unsupported. I changed the prerequisite and conclusion to describe VXLAN as the approach used by the post rather than the only supported Windows option.
- The introduction implied VXLAN encapsulation and BGP peering together as a generic Windows mode. Calico documentation says VXLAN with Calico CNI requires BGP to be disabled, while BGP is supported as non-overlay networking. I clarified that distinction.
- The prerequisites listed Calico v3.12+ for Windows support. Open source Calico for Windows policy support was announced for Calico v3.16, and the current operator-based HostProcess install requires Calico v3.27+. I updated the version guidance.
- The prerequisites listed Windows Server 2019+ without tying support to Kubernetes version compatibility. Kubernetes and Calico Windows support vary by Kubernetes and Windows Server release, so I changed this to require a Windows Server version supported by the Kubernetes release.
- The VXLAN configuration snippet omitted the Calico IPAM strict affinity requirement for Windows nodes and did not mention disabling BGP for VXLAN on operator-managed installs. I replaced it with official `kubectl patch` commands for IPIP, VXLAN, strict affinity, and operator-managed BGP configuration.
- The Windows install example used a direct ZIP download and `install-calico.ps1` without noting that manual installation is deprecated or showing the official download script. I updated the example to prefer the operator-based HostProcess install and, for deprecated manual installs, to use `install-calico-windows.ps1 -DownloadOnly`.
- The tags used `Window` instead of `Windows`. I corrected the tag for accuracy.

## Review Notes
- The test commands are plausible, but the post depends on a valid `windows-pod.yaml` with a Windows-compatible image, `spec.os.name: windows` where applicable, and Windows node scheduling constraints.
- The IP pool CIDR must match the cluster's existing pod CIDR; the example patch assumes the default Calico IPPool is named `default-ipv4-ippool`.
