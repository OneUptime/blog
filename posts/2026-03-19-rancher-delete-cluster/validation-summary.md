# Validation Summary: How to Delete a Cluster in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- Amazon EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- AWS CLI
- Google Cloud CLI (`gcloud`)
- Azure CLI (`az`)

## Sources Consulted
- Rancher: Kubernetes Clusters in Rancher Setup  
  https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup
- Rancher: Cluster Configuration  
  https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration
- Rancher: Removing Kubernetes Components from Nodes  
  https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/clean-cluster-nodes
- Rancher FAQ: Rancher is No Longer Needed  
  https://ranchermanager.docs.rancher.com/faq/rancher-is-no-longer-needed
- Rancher Kubernetes API: Projects  
  https://ranchermanager.docs.rancher.com/api/workflows/projects
- Kubernetes: `kubectl` Quick Reference  
  https://kubernetes.io/docs/reference/kubectl/quick-reference/
- AWS CLI: `aws eks list-clusters`  
  https://docs.aws.amazon.com/cli/latest/reference/eks/list-clusters.html
- Amazon EKS: Delete a cluster  
  https://docs.aws.amazon.com/eks/latest/userguide/delete-cluster.html
- Amazon EKS: Protect EKS clusters from accidental deletion  
  https://docs.aws.amazon.com/eks/latest/userguide/deletion-protection.html
- Google Kubernetes Engine: Deleting a cluster  
  https://cloud.google.com/kubernetes-engine/docs/how-to/deleting-a-cluster
- Google Cloud CLI: `gcloud container clusters list`  
  https://cloud.google.com/sdk/gcloud/reference/container/clusters/list
- Azure Kubernetes Service: Delete an AKS cluster  
  https://learn.microsoft.com/en-us/azure/aks/delete-cluster
- Azure CLI: `az aks` reference  
  https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Azure Resource Manager: Lock your Azure resources  
  https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources

## Issues Found
- The original post grouped Rancher custom-node clusters and infrastructure-provider clusters together. Rancher’s docs distinguish clusters launched on existing custom nodes from clusters whose nodes Rancher provisions in an infrastructure provider, so the deletion behavior was split accordingly.
- The backup section said `kubectl get all -A -o yaml` exported “all custom resources.” That is inaccurate; I corrected the wording so it no longer overstates what the `all` shortcut returns.
- The imported-cluster cleanup section used a manual set of namespace, RBAC, and CRD deletions that did not match Rancher’s documented cleanup flow. I replaced it with Rancher’s documented `user-cluster.sh` cleanup procedure.
- The management-cluster cleanup section said each cluster gets a namespace. Rancher’s API docs show management-cluster namespaces are also used for cluster/project-backed Rancher resources, so I rewrote the cleanup guidance to inspect cluster resources, project resources, and Rancher-created namespaces more precisely.
- The force-delete example used `<CLUSTER_NAME>`, which could be confused with the display name. I changed it to `<CLUSTER_ID>` because the `clusters.management.cattle.io` resource is addressed by its Rancher resource name.
- The hosted-cluster deletion, recovery, and best-practice guidance was too broad across EKS, GKE, and AKS. I narrowed it to provider-documented behavior and removed unsupported claims about universal deletion protection or recovery.
- The UI confirmation sentence was softened because the exact delete confirmation prompt is version/UI-flow dependent and not consistently documented in the official guides.
- The multiple-cluster deletion section originally described a specific bulk-delete toolbar flow. I replaced it with the documented per-cluster delete workflow to avoid relying on UI behavior that was not covered in the consulted docs.

## Review Notes
- Rancher’s latest docs use “registered cluster” terminology and explicitly note that cluster registration replaced the older “import” wording. The post still says “imported cluster,” which is understandable, but “registered cluster” is the more current term.
- Provider cleanup behavior varies after hosted-cluster deletion. For example, AWS documents prerequisite cleanup for Services and Ingresses, GKE documents that load balancer cleanup is not always guaranteed and persistent disks are retained, and AKS documents deletion of the node resource group and its resources.
