# Validation Summary: How to Install Calico on Windows Nodes Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico for Windows
- Kubernetes Windows nodes
- Windows Server 2019 and 2022
- PowerShell
- VXLAN networking
- Calico CNI
- Calico BGP for Windows

## Sources Consulted
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows manual installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico for Windows operator installation notes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- Project Calico v3.27.0 GitHub release assets: https://github.com/projectcalico/calico/releases/tag/v3.27.0

## Issues Found
- The post incorrectly stated that BGP-based routing is not supported on Windows nodes. Calico documentation lists Calico BGP with the Windows BGP router as a supported networking option, with limitations. Updated the explanation to say VXLAN and Windows BGP are supported, IP-in-IP is not supported, and BGP must be disabled when using Calico CNI with VXLAN.
- The prerequisites omitted the Windows-side `kubectl.exe` and kubeconfig requirement used by the manual installer. Added the requirement to copy the kubelet kubeconfig to `C:\k\config` and have `kubectl.exe` available on each Windows node.
- The download step fetched the zip file directly and expanded it to `C:\CalicoWindows`, which would create an incorrect nested directory because the release archive already contains a `CalicoWindows` root folder. Replaced it with the official `install-calico-windows.ps1` download and `-DownloadOnly yes` preparation flow.
- The configuration step showed `C:\CalicoWindows\config.ps1` as if it edited the file, but running that path executes the script. Changed the example to open the file with Notepad.
- The PowerShell snippet used `$env:COMPUTERNAME.ToLower()`, which is not the correct way to call `ToLower()` on the environment variable value. Updated it to set `$env:NODENAME = $(hostname).ToLower()` and then use that for `CALICO_K8S_NODE_REF`, matching Calico's default config approach.

## Review Notes
The manual Windows service installation path is deprecated in current Calico documentation in favor of the Tigera Operator and Windows HostProcess containers. The post remains valid as a manual install guide for the v3.27.0 artifacts it references, but a future update should consider converting it to the operator-based installation path.
