# Validation Summary: How to Troubleshoot Windows Container Issues in Rancher - Containers

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rancher (Windows worker nodes)
- Kubernetes (kubectl)
- Windows containers (servercore, ltsc2019/ltsc2022)
- containerd runtime on Windows
- HNS (Host Network Service) and hns.psm1 module
- PowerShell (Test-NetConnection, Resolve-DnsName, Get-EventLog)
- Docker manifest inspect

## Sources Consulted
- Microsoft Windows container version compatibility docs: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft SDN / HNS PowerShell module: https://github.com/microsoft/SDN/tree/master/Kubernetes/windows
- RKE2 Windows node documentation: https://docs.rke2.io/install/windows_airgap
- containerd getting-started docs: https://github.com/containerd/containerd/blob/main/docs/getting-started.md
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **Inaccurate error code for OS version mismatch.** The post claimed the "most common" Windows container error is `exit code 0x0000007b`. This hex code corresponds to the Windows `INACCESSIBLE_BOOT_DEVICE` BSOD and is not the canonical container OS mismatch error. The actual message from hcsshim is `The container operating system does not match the host operating system`. Replaced the example with the canonical hcsshim error text.

2. **Missing `Import-Module` for HNS cmdlets.** `Get-HnsNetwork` and `Get-HnsEndpoint` are not built-in cmdlets; they come from `hns.psm1` (Microsoft's SDN repo), which must be imported first. Added `Import-Module C:\k\hns.psm1` before the HNS commands.

3. **Incorrect containerd log retrieval command.** The post used `kubectl logs -n kube-system $(kubectl get pods ... -l component=containerd -o name | head -1) | Select-String "error"`. Two problems: (a) containerd runs as a Windows service on the node, not as a pod (there is no standard `component=containerd` label), and (b) `head -1` is not PowerShell-native, so the command cannot run inside the PowerShell code block as written. Replaced with `Get-Service containerd` and reading the RKE2 containerd log file directly from `C:\var\lib\rancher\rke2\agent\logs\containerd.log`.

## Review Notes
- `Get-EventLog` is a Windows PowerShell 5.1 cmdlet and is not available in PowerShell 7+. Windows Server nodes typically still ship PowerShell 5.1, so the commands work, but on newer hosts `Get-WinEvent` is the forward-compatible replacement.
- `Restart-Service hns` is accurate but destructive — it tears down all pod networking on the node. The post already notes this.
- Windows container image tags (`ltsc2019`, `ltsc2022`) are strictly version-coupled to the host build number in process-isolation mode; Hyper-V isolation can relax this. The post's core guidance to match image and node OS versions is correct.
- The `Window` tag appears to be a typo for `Windows` in the frontmatter, but tag spelling is outside the technical-correctness scope of this review.
