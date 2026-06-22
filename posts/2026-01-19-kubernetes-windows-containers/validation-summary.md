# Validation Summary: How to Run Windows Containers in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Windows containers
- Windows Server node pools
- Amazon EKS and eksctl
- Azure Kubernetes Service
- Google Kubernetes Engine
- containerd
- kubeadm
- gMSA
- Windows HostProcess containers
- SMB CSI driver
- Azure Files CSI driver
- Calico for Windows
- Prometheus windows_exporter

## Sources Consulted
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes kubeadm Windows worker node documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/adding-windows-nodes/
- Kubernetes gMSA documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-gmsa/
- Kubernetes HostProcess documentation: https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Amazon EKS Windows nodes documentation: https://docs.aws.amazon.com/eks/latest/userguide/windows-support.html
- eksctl Windows worker node documentation: https://docs.aws.amazon.com/eks/latest/eksctl/windows-worker-nodes.html
- AKS node pool documentation: https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- GKE Windows node pool documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/creating-a-cluster-windows
- SMB CSI driver examples: https://github.com/kubernetes-csi/csi-driver-smb/blob/master/deploy/example/e2e_usage.md
- Azure Files CSI documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-files
- Calico for Windows documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Prometheus windows_exporter Kubernetes documentation: https://github.com/prometheus-community/windows_exporter/blob/master/kubernetes/kubernetes.md

## Issues Found
- Corrected the Windows tag typo from "Window" to "Windows".
- Updated the runtime, networking, and storage comparison table to avoid inaccurate claims that all Linux CNIs/CSI drivers apply universally and that Windows only supports containerd.
- Replaced outdated Windows Server SAC and broad Kubernetes version guidance with current upstream Windows Server 2022/2025 compatibility guidance and provider-specific wording.
- Removed the Linux node taint from the EKS example because it could prevent Linux-only system pods such as CoreDNS from scheduling.
- Added `--windows-os-version ltsc2022` to the GKE Windows node pool example so it matches the Windows Server 2022 intent.
- Replaced the manual Windows node setup with the Kubernetes-recommended `sig-windows-tools` scripts for installing containerd, kubeadm, and kubelet, and added the `kubeadm join` step.
- Added `spec.os.name` to Windows and Linux pod examples where appropriate, matching current Kubernetes guidance for OS-specific workloads.
- Quoted and escaped the Windows `mountPath` in the ASP.NET example to avoid YAML/path ambiguity.
- Clarified the .NET cross-platform example so it does not imply a single arbitrary image tag can run across Linux and Windows without OS-specific image variants or manifests.
- Updated the SMB CSI example to use an externally resolvable SMB server name instead of a Kubernetes service DNS name, which is not suitable for Windows CSI proxy based SMB mounts.
- Replaced the Calico ConfigMap example with a Calico operator `Installation` custom resource that reflects the supported Windows-capable configuration model.
- Updated the `windows_exporter` DaemonSet to run as a HostProcess pod with host networking and corrected the collector argument format, because host metrics require HostProcess access.

## Review Notes
The YAML snippets were syntax-checked after editing. No local Kubernetes schema validator such as `kubectl`, `kubeconform`, or `kubeval` was installed in the workspace, so schema validation was performed by cross-checking against official documentation.
