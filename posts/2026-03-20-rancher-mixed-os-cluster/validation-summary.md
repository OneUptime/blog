# Validation Summary: How to Configure Mixed Linux and Windows Clusters in Rancher - Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Windows worker nodes
- Linux worker nodes
- `kubectl`
- PowerShell
- Python `requests`

## Sources Consulted
- Rancher Manager docs, "Launching Kubernetes on Windows Clusters": https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- RKE2 docs, "Windows Agent (Worker) Node Installation": https://docs.rke2.io/install/quickstart#windows-agent-worker-node-installation
- RKE2 docs, "Network Options": https://docs.rke2.io/networking/basic_network_options
- RKE2 docs, "Configuration Options": https://docs.rke2.io/install/configuration
- RKE2 Windows installer script: https://raw.githubusercontent.com/rancher/rke2/master/install.ps1
- Kubernetes docs, "Deployments": https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes docs, "DaemonSet": https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes docs, "Windows in Kubernetes": https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes docs, "`kubectl drain`": https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain

## Issues Found
- The prerequisites were missing the requirement for at least one Linux worker node. I updated that because Rancher documents that key cluster services still need Linux scheduling targets in mixed-OS clusters.
- The post treated Flannel as the only supported Windows-compatible CNI and used `kubectl get configmap rke2-cfg` to verify it. I corrected this to reflect current RKE2 Windows support for Calico or Flannel and changed the verification step to inspect RKE2 HelmChart resources in `kube-system`.
- The `apps/v1` Deployment examples in Steps 3 and 5 were invalid because they omitted `.spec.selector` and matching pod template labels. I added the required selectors and labels.
- Rancher adds a `cattle.io/os=linux:NoSchedule` taint to Linux worker nodes in mixed Windows clusters. I updated the Linux workload example and the Linux-targeted DaemonSet template fragments to include the matching toleration, and I removed the unsupported Windows-side toleration from the workload example.
- The Step 4 and Step 7 DaemonSet examples were not suitable as written for chart-managed mixed-OS Rancher components. I replaced them with technically correct pod-template fragments that show the OS selector and required Rancher Linux-worker toleration values to set through chart configuration.
- The Windows upgrade example used an outdated manual flow based on deleting the service and downloading a ZIP from a pinned release URL. I replaced it with the documented `install.ps1` reinstallation approach and kept the cluster-admin `kubectl drain` and `kubectl uncordon` steps separate from the Windows-node commands.

## Review Notes
- For chart-managed components, durable mixed-OS placement should be configured through chart values so Rancher or Helm reconciliation does not overwrite it.
- The post is now technically correct for Linux/Windows scheduling. If a future revision covers multiple Windows Server builds in one cluster, it should also mention the built-in `node.kubernetes.io/windows-build` label for image and host build compatibility.
