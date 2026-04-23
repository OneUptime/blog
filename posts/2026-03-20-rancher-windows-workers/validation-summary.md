# Validation Summary: How to Add Windows Worker Nodes to Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Windows worker nodes
- PowerShell
- Calico
- Flannel
- containerd / crictl

## Sources Consulted
- Rancher: Launching Kubernetes on Windows Clusters - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Rancher: Launching Kubernetes on Existing Custom Nodes - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- RKE2: Requirements - https://docs.rke2.io/install/requirements
- RKE2: Quick Start - https://docs.rke2.io/install/quickstart
- RKE2: Configuration Options - https://docs.rke2.io/install/configuration
- RKE2: Network Options - https://docs.rke2.io/networking/basic_network_options
- Kubernetes: Windows containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes: Guide for Running Windows Containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- RKE2 source: Windows service implementation - https://github.com/rancher/rke2/blob/master/pkg/cli/cmds/agent_service_windows.go
- K3s source: Windows CRI config generation used by RKE2 - https://github.com/k3s-io/k3s/blob/master/pkg/agent/run_windows.go

## Issues Found
- The original post mixed the Rancher-managed workflow with a standalone manual RKE2 Windows installation. I replaced Step 3 with the documented Rancher registration flow, where the Windows worker is added using the Windows registration command generated in the Rancher UI.
- The networking guidance said Flannel `host-gw` works for Windows and used `kubectl get configmap rke2-cfg`, which is not the right way to verify the active RKE2 CNI. I corrected this to Rancher/RKE2's supported Windows CNIs (`Calico` or `Flannel`), noted that Flannel on Windows uses `vxlan`, and replaced the example with current CNI guidance.
- The prerequisites omitted Rancher's requirement for at least one Linux worker node and included `Windows 10/11 for dev`, which does not match RKE2's documented Windows worker validation. I updated the prerequisites and introduction accordingly.
- The Windows preparation steps installed Hyper-V and recommended disabling Defender and Windows Firewall. I replaced those instructions with the documented `Containers` feature enablement, reboot requirement, and explicit port guidance. I also corrected the Windows VXLAN port from UDP `8472` to UDP `4789`.
- The original Windows node configuration manually added `kubernetes.io/os`, `beta.kubernetes.io/os`, and `node.kubernetes.io/windows-build` labels. I changed the post to rely on the labels Kubernetes adds automatically and removed the deprecated `beta.kubernetes.io/os` label.
- The runtime verification section assumed a separate `containerd` Windows service and used a `ctr.exe` path that does not match the RKE2 installation layout. I updated the verification commands to check the `rke2` service, inspect containers with `crictl.exe` using the generated `crictl.yaml` config, and read recent `rke2` events from the Windows Application log.

## Review Notes
- Upstream Kubernetes documentation now describes Windows Server 2022 and Windows Server 2025 as supported Windows node platforms, while current RKE2 documentation still validates Windows Server 2019 LTSC and 2022 LTSC for Windows worker nodes. Because this post is specifically about Rancher-managed RKE2 clusters, the corrected article follows the RKE2 platform guidance.
- When mixing multiple Windows versions in the same cluster, workloads should use the automatically applied `node.kubernetes.io/windows-build` label in their `nodeSelector` rules to land on compatible nodes.
