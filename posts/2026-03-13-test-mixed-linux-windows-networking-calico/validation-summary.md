# Validation Summary: How to Test Mixed Linux and Windows Networking with Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.27.0 referenced) — Project Calico CNI
- Calico for Windows
- Kubernetes (mixed Linux/Windows node clusters)
- Windows Server (containers / pods)
- VXLAN encapsulation (UDP port 4789)
- BGP peering
- kubectl
- PowerShell (Windows install steps)
- Mermaid (architecture diagram)

## Sources Consulted
- Project Calico GitHub repository — `node/windows-packaging/install-calico-windows.ps1`: https://github.com/projectcalico/calico/blob/master/node/windows-packaging/install-calico-windows.ps1
- Tigera blog post: "Tigera announces open-source Calico for Windows" (Sept 22, 2020): https://www.tigera.io/blog/tigera-announces-open-source-calico-for-windows-and-collaboration-with-microsoft/
- Microsoft Open Source Blog: "Calico for Windows goes open source": https://opensource.microsoft.com/blog/2020/09/22/calico-for-windows-goes-open-source
- Calico Windows requirements docs: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico v3.27.0 release: https://github.com/projectcalico/calico/releases/tag/v3.27.0

## Issues Found
1. **Wrong installation script filename.** The post originally referenced `C:\CalicoWindows\install-calico.ps1`. The actual script shipped in `calico-windows-v3.27.0.zip` (and in the projectcalico/calico repo) is `install-calico-windows.ps1`. Fixed the path in the PowerShell install snippet.
2. **Incorrect minimum Calico version.** The Prerequisites listed "Calico v3.12+ with Windows support", but open-source Calico for Windows was first released in **Calico v3.16** (September 2020). Before v3.16 it was only available as a commercial Tigera product. Updated the requirement to "Calico v3.16+ with Windows support (open-source Calico for Windows)".

## Review Notes
- The `IPPool` manifest using `vxlanMode: Always` and `ipipMode: Never` is correct — IP-in-IP is not supported on Windows nodes, and Calico's documentation requires turning IPIP off on the default IP pool when adding Windows nodes.
- The claim that Calico for Windows supports both VXLAN and BGP peering is accurate; BGP mode is supported on Windows nodes in addition to VXLAN.
- VXLAN UDP port 4789 is the IANA-assigned standard port and matches Calico's default; this is correct.
- The `ping -n 3` invocation inside a Windows pod uses the Windows `ping.exe` flag for count, which is correct (Linux `ping` uses `-c`).
- The `windows-pod.yaml` manifest is referenced but not shown; readers would need to supply their own Windows pod spec (with a `nodeSelector` for `kubernetes.io/os: windows` and a Windows container image). This is a content-completeness observation rather than a technical error.
- The post mentions Windows Server 2019+ as a prerequisite. Calico for Windows v3.27 documentation lists Windows Server 1809 (LTSC 2019) and Windows Server 2022 as supported; "Windows Server 2019+" is a reasonable informal way of expressing this for a general audience.
- MTU configuration is mentioned in the conclusion but not detailed in the post — readers operating real mixed clusters should consult the Calico for Windows networking docs for the correct MTU (typically pod MTU = host MTU − 50 for VXLAN).
