# Validation Summary: How to Run Windows Containers on Kubernetes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- Windows containers
- AKS Windows node pools
- kubeadm Windows worker nodes
- containerd
- Kubernetes Deployments, DaemonSets, Services, Ingress, node selectors, taints, and tolerations
- Python subprocess-based Kubernetes health checks

## Sources Consulted
- Kubernetes Windows containers overview: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes guide for adding Windows worker nodes with kubeadm: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/adding-windows-nodes/
- Kubernetes guide for running Windows containers and Windows build labels: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes HostProcess Pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Kubernetes node labels populated by kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Microsoft AKS Windows container deployment quickstart: https://learn.microsoft.com/en-us/azure/aks/learn/quick-windows-container-deploy-cli
- Microsoft AKS node pool documentation: https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Microsoft .NET container image documentation: https://learn.microsoft.com/en-us/dotnet/core/docker/container-images
- Microsoft .NET Framework Docker image repository: https://github.com/microsoft/dotnet-framework-docker

## Issues Found
- The AKS node pool example pinned `--kubernetes-version 1.30.0`, which is outdated for a 2026 review and unnecessary in the AKS example. Removed the version pin so AKS uses a compatible cluster/node pool version.
- The manual kubeadm Windows setup manually downloaded binaries and registered containerd, but Kubernetes documents the supported Windows kubeadm path using the SIG Windows `Install-Containerd.ps1` and `PrepareNode.ps1` scripts. Replaced the manual steps with those scripts and corrected the `kubeadm join` CA hash format to include `sha256:`.
- The Windows Deployment did not set `.spec.template.spec.os.name`. Added `os.name: windows`, matching Kubernetes Windows Pod guidance.
- The .NET Framework image used the generic `mcr.microsoft.com/dotnet/framework/aspnet:4.8` tag. Changed it to `4.8-windowsservercore-ltsc2022` so the sample aligns with the Windows Server 2022 node and Kubernetes Windows OS compatibility requirements.
- The health probe comment implied Windows containers require different health check paths. Changed it to say the path should match the application, because Kubernetes probes work for Windows containers and the path is application-specific.
- The DaemonSet example used `apps/v1` without a required selector and matching Pod template labels. Added `spec.selector.matchLabels` and `template.metadata.labels`.
- The HostProcess limitation incorrectly said "No HostProcess pods" even though HostProcess containers are stable and supported for Windows host administration scenarios. Reworded the item to explain that HostProcess pods require Windows-specific configuration and are different from ordinary process-isolated application containers.
- The image-version matching Deployment used `apps/v1` without a required selector or Pod template labels. Added `replicas`, `selector.matchLabels`, matching template labels, and `os.name: windows`.
- The image-version matching comment mentioned runtime class or node affinity, but the snippet uses a node selector. Updated the comment to match the actual configuration.

## Review Notes
- The AKS example still uses `Windows2022`, which Microsoft currently documents as supported for Kubernetes 1.25-1.35 and retiring in March 2027. Future updates should revisit this for Windows Server 2025 once it is appropriate for the target AKS version.
- The Windows node setup example follows current Kubernetes documentation for v1.36. Operators should still choose Kubernetes and containerd versions compatible with their cluster.
- `kubectl`, `az`, and a live Kubernetes cluster were not available locally, so command validation was performed against official Kubernetes and Microsoft documentation. YAML snippets were parsed locally with PyYAML, and the Python snippet was compile-checked.
