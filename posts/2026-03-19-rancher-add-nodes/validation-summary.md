# Validation Summary: How to Add Nodes to a Rancher-Managed Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- K3s
- Amazon EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- Windows worker nodes on Rancher-managed RKE2 clusters
- `kubectl`

## Sources Consulted
- Rancher: Launching Kubernetes on Existing Custom Nodes: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher: Launching Kubernetes on Windows Clusters: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Rancher: Nodes and Machine Pools: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Rancher: Node Requirements for Rancher Managed Clusters: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/node-requirements-for-rancher-managed-clusters
- Rancher: EKS Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/eks-cluster-configuration
- Rancher: GKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/gke-cluster-configuration
- Rancher: AKS Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/cluster-configuration/rancher-server-configuration/aks-cluster-configuration
- RKE2: Requirements: https://docs.rke2.io/install/requirements
- RKE2: Logging: https://docs.rke2.io/reference/logging
- RKE2: Managing Packaged Components: https://docs.rke2.io/install/packaged_components
- K3s: Requirements: https://docs.k3s.io/installation/requirements
- K3s: FAQ: https://docs.k3s.io/faq
- K3s: Advanced Options / Configuration: https://docs.k3s.io/advanced
- Kubernetes: Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Rancher upstream source for installer paths: https://github.com/rancher/rancher/blob/main/pkg/capr/installer/installer.go
- Rancher upstream source for packaged installer assets: https://github.com/rancher/rancher/blob/main/package/Dockerfile

## Issues Found
- The Windows section was too broad and implied Windows nodes were a general Rancher feature. Rancher’s current docs scope this flow to custom RKE2 clusters with Windows support enabled and require the cluster to already be running with Linux etcd, control plane, and worker nodes before the Windows worker command appears. I narrowed the section accordingly.
- The Windows PowerShell example used `system-agent-install.ps1`, but Rancher’s upstream installer path for Windows RKE2 workers is `wins-agent-install.ps1`. I corrected the code example to use the upstream Windows installer filename.
- The system requirement comments used hard-coded minimum CPU, memory, and disk values that were too broad for a post covering both RKE2 and K3s. I changed the wording to point readers to distribution-specific requirements instead of presenting one set of minimums as universal.
- The network checks implied that the same port set applied everywhere and treated `9345` as a generic requirement. I corrected the section to note that ports vary by distribution and CNI, and limited the examples to the documented RKE2/K3s server ports.
- The time synchronization example assumed `chronyd`, which is not the default time-sync service on every supported Linux distribution. I changed it to a generic synchronization check.
- The verification section described a `nodeName`-pinned test pod as a scheduling test. Kubernetes documents that `nodeName` bypasses the scheduler, so I changed the heading and wording to describe it accurately as direct pod placement on the node.
- The troubleshooting guidance referenced `systemctl status kubelet` generically for Rancher-managed RKE2/K3s nodes. I updated it to the documented RKE2 and K3s service logs instead.
- The troubleshooting bullets for an “expired” registration command and an immutable wrong-role state were stronger than the documentation supported. I rephrased them as concrete recovery actions without overclaiming.

## Review Notes
- `kubectl top node` requires metrics-server. The post now states that dependency explicitly.
- The Linux and Windows registration commands shown in the post are examples; Rancher generates the exact command in the UI, and the final command can vary based on settings such as CA configuration and agent TLS mode.
- The hosted-cluster sections for EKS, GKE, and AKS are intentionally high-level. The exact editable node-group or node-pool fields can differ by provider and whether autoscaling is enabled.
