# Validation Summary: How to Deploy Windows Workloads on RKE2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes mixed Linux/Windows clusters
- RKE2 Windows agent
- Windows Server containers
- Calico and Flannel CNI
- Kubernetes node selectors, taints, tolerations, Services, and Pod OS fields
- Microsoft Windows Server Core IIS container images

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Networking Services: https://docs.rke2.io/networking/networking_services
- RKE2 v1.34 release notes: https://docs.rke2.io/release-notes/v1.34.X
- Kubernetes Windows containers overview: https://v1-34.docs.kubernetes.io/docs/concepts/windows/intro/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes well-known labels, annotations, and taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Microsoft Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Container Registry IIS tags: https://mcr.microsoft.com/v2/windows/servercore/iis/tags/list

## Issues Found
- RKE2 Windows CNI support was described as Calico-only. Updated the text to state that RKE2 Windows support works with Calico or Flannel, while keeping Calico as the CNI used by the guide.
- The Linux and Windows install examples used inconsistent and outdated RKE2 version handling. Pinned both sides to `v1.34.6+rke2r3`, the current RKE2 stable release on the validation date.
- The Windows install flow downloaded `rke2-windows-amd64.exe` and ran `C:\rke2-windows-amd64.exe install`, which is not the documented RKE2 Windows service installation command. Replaced it with the official `install.ps1` flow and `rke2.exe agent service --add`.
- The architecture section referenced a non-standard `rke2-windows-agent` name. Updated it to the RKE2 Windows agent service (`rke2`).
- The node-labeling step attempted to add `kubernetes.io/os=windows` manually. Kubernetes populates this label via the kubelet, so the post now verifies the built-in label instead.
- The Windows workload manifest omitted `.spec.os.name: windows`. Added the Pod OS field and kept the `nodeSelector` and toleration because scheduling still requires normal Kubernetes placement controls.
- The IIS image example did not warn that the `windowsservercore-ltsc2022` tag only matches Windows Server 2022 nodes. Added guidance to use the `windowsservercore-ltsc2019` tag on Windows Server 2019.
- The service exposure command used `type=LoadBalancer` without configuring a load balancer controller. Replaced it with `NodePort`, which works without optional RKE2 ServiceLB or an external load balancer integration.
- The image compatibility note referenced Docker Hyper-V isolation. Kubernetes Windows containers use process isolation, so the note now instructs readers to match the image tag to the node's Windows Server release.

## Review Notes
RKE2 `v1.34.6+rke2r3` is current stable as of 2026-04-23 and aligns with Kubernetes v1.34 Windows Server 2019/2022 support. Future updates should revisit the Windows Server version guidance when moving the tutorial to RKE2/Kubernetes v1.35 or newer.
