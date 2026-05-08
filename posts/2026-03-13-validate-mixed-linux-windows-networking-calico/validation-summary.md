# Validation Summary: How to Validate Mixed Linux and Windows Networking with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico for Windows
- Kubernetes
- Linux and Windows worker nodes
- VXLAN and BGP networking
- Calico IPPool configuration
- kubectl
- PowerShell

## Sources Consulted
- Calico Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico manual Windows install documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico VXLAN/IP-in-IP overlay documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Project Calico v3.27.0 GitHub release: https://github.com/projectcalico/calico/releases/tag/v3.27.0

## Issues Found
- The introduction implied Calico for Windows provides the same network policy capabilities as Linux pods. Updated the wording to note Windows-specific policy and networking limitations, because official Calico documentation lists unsupported Windows features such as host endpoint policy, application layer policy, WireGuard, IPv6/dual stack, and service advertisement.
- The prerequisites listed Calico v3.12+ without caveats. Updated this to Calico v3.27+ for operator-based installs, matching current Calico Windows requirements for operator-managed clusters.
- The prerequisites omitted the Calico IPAM strict affinity requirement. Added it and included the official `kubectl patch ipamconfigurations default` command because Calico requires strict affinity when using Calico IPAM with Windows nodes.
- The post described VXLAN as required for Windows generally. Scoped that language to this guide's VXLAN example because Calico for Windows also supports non-overlay BGP networking with limitations.
- The Windows install snippet used a direct v3.27.0 ZIP download and skipped the current documented download helper. Updated the snippet to use the documented `install-calico-windows.ps1` download flow and noted that `C:\CalicoWindows\config.ps1` must be configured before running `install-calico.ps1`.
- The Windows pod deployment command did not mention Windows scheduling. Added a note that `windows-pod.yaml` must schedule to a Windows node so the example does not accidentally create an unschedulable or Linux-targeted pod.
- The conclusion overstated policy consistency across operating systems. Updated it to say Kubernetes network policies can be enforced across both OS types while accounting for Windows-specific Calico limitations.

## Review Notes
The manual Calico for Windows installation method is documented as deprecated in favor of the Tigera Operator with Windows HostProcess containers, and support for the manual method is expected to be removed in a future Calico version. A future post revision should prefer the operator-based installation flow throughout.
