# Validation Summary: How to Add Windows Worker Nodes to an Existing Linux Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- Windows worker nodes
- Windows containers
- containerd
- Calico
- Antrea
- PowerShell

## Sources Consulted
- Kubernetes documentation: Adding Windows worker nodes: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/adding-windows-nodes/
- Kubernetes documentation: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes documentation: Guide for Running Windows Containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes documentation: Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes documentation: Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Calico documentation: Install Calico for Windows using Operator: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Antrea documentation: Deploying Antrea on Windows: https://antrea.io/docs/main/docs/windows/
- Kubernetes SIG Windows tools guide: https://github.com/kubernetes-sigs/sig-windows-tools/blob/master/guides/guide-for-adding-windows-node.md

## Issues Found
- The post used Docker and DockerMsftProvider as the required Windows container runtime. Kubernetes removed dockershim in v1.24, and current Windows kubeadm documentation uses containerd with the SIG Windows helper scripts. Replaced the Docker install and verification commands with containerd installation and verification.
- The post manually downloaded kubelet and kube-proxy and configured deprecated/removed kubelet flags such as Docker socket usage and CNI flag wiring. Replaced this with the current `PrepareNode.ps1` and `kubeadm join` workflow.
- The Flannel Windows instructions were outdated and no longer match current Kubernetes Windows node guidance. Replaced them with Calico operator preparation commands and a note to follow plugin-specific Calico or Antrea Windows documentation.
- The join section incorrectly described copying kubeconfig after generating a kubeadm join command. Updated it to run the generated `kubeadm join` command on the Windows node.
- The service setup section used NSSM and manual kubelet/kube-proxy services. Updated it to reflect that the SIG Windows scripts and `kubeadm join` configure the kubelet service.
- The examples used Kubernetes v1.28.5, Windows Server 2019 image tags, and the Windows Server 2019 build label. Updated examples to Kubernetes v1.36.0, Windows Server 2022 image tags, and `node.kubernetes.io/windows-build: "10.0.20348"`.
- The node labeling section attempted to manually add Kubernetes-managed labels. Updated it to verify automatic labels and add only a custom workload label.
- Troubleshooting commands referenced Docker and Flannel. Updated them to use containerd, CNI paths, kubelet service status, and Kubernetes Windows log path guidance.
- Corrected the tag typo from `Window` to `Windows`.

## Review Notes
The post is now aligned with current Kubernetes Windows kubeadm guidance. CNI setup remains intentionally plugin-specific because Calico and Antrea require different cluster-side and Windows-side installation steps.
