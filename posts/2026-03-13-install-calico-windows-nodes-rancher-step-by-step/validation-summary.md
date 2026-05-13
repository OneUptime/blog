# Validation Summary: How to Install Calico on Windows Nodes with Rancher Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes Windows worker nodes
- Calico CNI
- kubectl
- PowerShell
- Windows Server containers

## Sources Consulted
- Rancher Manager documentation: Launching Kubernetes on Windows Clusters, https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- RKE2 documentation: Requirements, https://docs.rke2.io/install/requirements
- RKE2 documentation: Network Options, https://docs.rke2.io/networking/basic_network_options
- RKE2 documentation: Quick Start / Windows Agent Node Installation, https://docs.rke2.io/install/quickstart
- Calico documentation: Windows requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Kubernetes documentation: Windows containers in Kubernetes, https://kubernetes.io/docs/concepts/windows/intro/

## Issues Found
- The introduction implied that both RKE and RKE2 were equally applicable for Calico on Windows nodes. Updated it to focus on RKE2, which Rancher's current custom Windows cluster workflow documents with Calico or Flannel support.
- The prerequisites omitted the Windows Server Containers feature required by RKE2 Windows agents. Added it as a prerequisite.
- The CLI verification command checked a namespaced Tigera `Installation` and an RKE2 values ConfigMap in `cattle-system`. Replaced it with checks for the RKE2 `rke2-calico` HelmChart in `kube-system` or the cluster-scoped Tigera `Installation`.
- The RKE2 configuration example used an unsupported Rancher-style `windowsProfileSpec` snippet. Replaced it with the RKE2 server config keys for selecting Calico before cluster initialization.
- The Rancher registration steps described selecting Windows as the node type. Updated the wording to match Rancher's documented Registration tab workflow: select the Worker role and copy the Windows worker command.
- The PowerShell example used an invalid `iex (irm ...) -server ...` form. Replaced it with an instruction to run the exact Rancher-generated Windows worker registration command in an elevated PowerShell console.
- The Windows test pod did not set `spec.os.name` and used a Windows Server 2019 / 1809 container image tag even though the prerequisites also allowed Windows Server 2022. Added `spec.os.name: windows`, changed the example image to `ltsc2022`, and added a note to use an image tag matching the Windows Server node version.
- The conclusion referred to enabling Windows node pools in the cluster configuration. Updated it to refer to selecting Calico for the Windows-capable RKE2 cluster.

## Review Notes
Rancher and Kubernetes Windows support is version-sensitive. Future revisions should keep the Windows Server versions, Kubernetes version, and Windows container base image tags aligned with the active Rancher and RKE2 support matrices.
