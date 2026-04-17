# Validation Summary: How to Add Windows Worker Nodes to Rancher - Worker Nodes

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Rancher (RKE1-style cluster configuration)
- Kubernetes (Windows worker nodes)
- Windows Server 2019/2022
- PowerShell (Windows setup)
- Flannel (VXLAN backend) and Calico (Windows CNI)
- Windows HNS (Host Networking Service)
- IIS / Windows Server Core container images (mcr.microsoft.com)
- kubectl (labels, taints, tolerations, nodeSelector)

## Sources Consulted
- Rancher docs: Windows cluster support for RKE (https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/rke1-for-rancher/windows-clusters)
- Kubernetes docs: Windows in Kubernetes / "Guide for scheduling Windows containers in Kubernetes" (https://kubernetes.io/docs/concepts/windows/)
- Kubernetes well-known labels: `kubernetes.io/os` (https://kubernetes.io/docs/reference/labels-annotations-taints/)
- Microsoft Container docs: Install Containers feature on Windows Server (https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment)
- Microsoft HNS / EnableCompartmentNamespace registry setting documentation for Kubernetes on Windows
- Microsoft Container Registry: `mcr.microsoft.com/windows/servercore/iis` image tags (ltsc2022)
- Flannel Windows backend documentation (VXLAN requirement for mixed clusters)

## Issues Found
- **Prerequisites inconsistency (fixed):** The prerequisites listed "Flannel with host-gateway or Calico for Windows networking," but the RKE config snippet in Step 2 explicitly states `flannel_backend_type: vxlan` is required for Windows and that host-gw may not work. For mixed Windows/Linux clusters on Rancher/RKE1, Flannel must use the VXLAN backend. Updated the prerequisite to "Flannel with VXLAN backend or Calico for Windows networking" to align with both the config snippet and the Rancher/Kubernetes documentation.

## Review Notes
- The `Set-ItemProperty ... EnableCompartmentNamespace -Value 1` on `HKLM:\SYSTEM\CurrentControlSet\Services\hns\State` is the correct registry setting required for Kubernetes network compartment isolation on Windows Server.
- `Install-WindowsFeature -Name Containers` is the correct feature name on Windows Server.
- `kubernetes.io/os: windows` is the correct stable node label (replaced the deprecated `beta.kubernetes.io/os` in Kubernetes 1.14+).
- The Rancher registration command shape (`PowerShell.exe -executionpolicy bypass -File "c:\run.ps1" -server ... -token ... --worker`) matches the format produced by the Rancher UI when adding a Windows worker.
- The example IIS image `mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022` is a valid Microsoft Container Registry tag for Windows Server 2022 hosts; the post's closing reminder to match container base image version to host OS version is correct (Windows host/container OS version compatibility is stricter than Linux).
- Minor caveat: RKE1-based Windows support is the context here. RKE2 has different Windows configuration semantics, and the post is explicitly written for the RKE1/Rancher UI flow — readers on RKE2 should consult the RKE2 Windows docs instead. This is not an error in the post but worth noting since Rancher has been shifting toward RKE2.
- The custom `os=windows:NoSchedule` taint in Step 5 is an author-chosen convention (not automatically applied by kubelet). The matching toleration in the Deployment spec correctly references the same key/value/effect, so the example is internally consistent.
