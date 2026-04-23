# Validation Summary: How to Configure Windows Networking in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Windows containers on Kubernetes
- Windows networking
- Flannel
- Calico
- CoreDNS
- PowerShell
- kubectl

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Windows Agent Configuration Reference: https://docs.rke2.io/reference/windows_agent_config
- RKE2 Helm / AddOns: https://docs.rke2.io/add-ons/helm
- Rancher: Launching Kubernetes on Windows Clusters: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Kubernetes: Networking on Windows: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes: Guide for Running Windows Containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Microsoft Learn: Windows and containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/about/
- Microsoft Learn: Overview of Windows Container Base Images: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- Microsoft Learn: Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn: Invoke-WebRequest (Windows PowerShell 5.1): https://learn.microsoft.com/en-us/powershell/module/Microsoft.PowerShell.Utility/Invoke-WebRequest?view=powershell-5.1

## Issues Found
- The post overstated Windows CNI support for Rancher/RKE2. It listed Antrea and implied Flannel `host-gw` was supported in RKE2. I corrected this to the current Rancher/RKE2-supported Windows CNIs: `Flannel` and `Calico`, and noted that RKE2 supports only Flannel `vxlan`.
- The CNI inspection/configuration example was inaccurate. I removed `kubectl get configmap rke2-cfg -n kube-system -o yaml` and the undocumented `flannel-backend: vxlan` line, then replaced them with checks that align with RKE2 docs: inspecting `/etc/rancher/rke2/config.yaml` and RKE2 AddOns.
- The Windows test-pod command would not work as written. It used `Nano Server` with `powershell.exe`, but Nano Server does not include PowerShell. The command also needed `--command` and a valid `apiVersion` in `--overrides`. I changed the example to `Windows Server Core`, added the missing flags, and clarified that the image tag must match the Windows node build.
- The NetworkPolicy section conflicted with the earlier Flannel recommendation. I clarified that on Rancher/RKE2 Windows clusters, `Calico` is required for NetworkPolicy enforcement and that Flannel does not enforce NetworkPolicy.
- The inline comment under `podSelector` was incorrect because NetworkPolicy pod selectors do not match node selectors. I removed that comment.
- The DNS section suggested a Windows-specific CoreDNS ConfigMap fix without upstream documentation to support it. I replaced that with verification steps for the `kube-dns` Service and CoreDNS pods, which matches the supported troubleshooting path more closely.
- The Step 5 PowerShell example used POSIX shell syntax (`$(...)`, `head`, and `\\` continuations). I rewrote it in valid PowerShell syntax and updated the web-request examples to use `-UseBasicParsing` for Windows PowerShell / Server Core compatibility.
- The `hostNetwork` guidance was wrong for current Kubernetes Windows support, and the Deployment example was invalid. I changed the section to recommend supported port mapping instead of `hostNetwork`, kept `hostNetwork: false`, and added the required Deployment selector and template labels.
- The troubleshooting section incorrectly tested Service ClusterIP connectivity from the Windows host. I replaced that with API-based inspection of the `kubernetes` and `kube-dns` Services and noted that actual ClusterIP connectivity checks should be done from a Windows pod.
- I also corrected the metadata tag typo from `Window` to `Windows`.

## Review Notes
- The post is Rancher/RKE2-specific, so I kept the prerequisite wording aligned to current RKE2 Windows validation (`Windows Server 2019` and `Windows Server 2022`). Upstream Kubernetes documentation now emphasizes newer Windows support separately, so this is a version-sensitive area worth rechecking on future updates.
- The ingress namespace in the NetworkPolicy example remains an example value. Clusters using Traefik or a non-default ingress namespace will need to adjust that selector.
