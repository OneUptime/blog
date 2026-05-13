# Validation Summary: How to Configure Mixed Linux and Windows Networking with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico for Windows
- Kubernetes mixed Linux/Windows clusters
- Calico IPPool resources
- VXLAN and BGP networking
- Windows PowerShell
- kubectl

## Sources Consulted
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows operator installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico for Windows manual installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Windows pod example: https://kubernetes.io/docs/tasks/configure-pod-container/configure-runasusername/
- Microsoft Open Source Blog announcement for Calico 3.16 Windows network policy support: https://opensource.microsoft.com/blog/2020/09/22/calico-for-windows-goes-open-source/
- Calico v3.27.0 Windows installer script source: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/node/windows-packaging/install-calico-windows.ps1

## Issues Found
- The post stated that VXLAN mode is required for Windows. Calico documentation supports VXLAN and non-overlay BGP for Windows, while IP-in-IP is unsupported. Updated the introduction, prerequisites, VXLAN snippet comments, and conclusion to reflect that VXLAN is one supported option rather than the only option.
- The post claimed Calico v3.12+ with Windows support. Open source Calico for Windows network policy support was introduced with Calico 3.16, and current operator installs require Calico v3.27+. Updated the prerequisite to avoid the incorrect v3.12 baseline.
- The Windows install snippet downloaded and manually extracted the Windows zip to `C:\CalicoWindows`, which does not match the official release installer flow and can create the wrong directory layout. Replaced it with the official `install-calico-windows.ps1` release installer command for v3.27.0.
- The post described identical network policy capabilities across Linux and Windows. Calico for Windows supports Kubernetes network policy, but the official limitations list Windows-specific gaps such as host endpoint policy and WireGuard. Updated the wording to mention Windows-specific limitations.
- Corrected the tag typo from `Window` to `Windows`.

## Review Notes
- The manual Windows installation method is deprecated in current Calico documentation in favor of the Tigera Operator and Windows HostProcess containers. The post's v3.27.0 manual script example remains plausible for the version it uses, but a future revision should consider showing the operator-based installation path.
