# Validation Summary: How to Configure AKS Cluster Autoscaler with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- AzureRM provider
- Kubernetes Deployments and Jobs
- Kubernetes Cluster Autoscaler
- `kubectl`

## Sources Consulted
- AzureRM provider `azurerm_kubernetes_cluster` docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- AzureRM provider `azurerm_kubernetes_cluster_node_pool` docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- AKS cluster autoscaler docs: https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler
- AKS cluster autoscaler overview and best practices: https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler-overview
- AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- AKS manual scaling and scale-to-zero behavior: https://learn.microsoft.com/en-us/azure/aks/scale-cluster
- Kubernetes Job docs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- OpenTofu `plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` docs: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The AzureRM AKS examples used the older `enable_auto_scaling` argument name. Updated the examples to the current `auto_scaling_enabled` argument used by recent AzureRM provider versions.
- Normalized numeric autoscaler profile fields to numeric HCL values where the current provider documents them as numbers, instead of quoting them as strings.
- The post pinned `kubernetes_version = "1.28"`, which is outdated as a fixed example version. Replaced it with `var.kubernetes_version` so readers can supply a currently supported AKS minor version.
- The `skip_nodes_with_local_storage = false` comment was incorrect. The value allows scale-down even when pods use local storage; it does not prevent data loss.
- The `balance_similar_node_groups` explanation overstated what the setting does. Updated the text to describe the documented AKS best practice of balancing similar zonal node pools, rather than claiming it directly balances zones within a single pool.
- The deploy step used `kubectl logs -n kube-system -l app=cluster-autoscaler -f`, which is not the documented way to inspect autoscaler status on managed AKS. Replaced it with the documented `cluster-autoscaler-status` ConfigMap command and autoscaler warning events query.
- The deploy step never applied the Kubernetes workload manifest, so the later `kubectl scale deployment` command would fail. Added `kubectl apply -f kubernetes/workload.yaml`.
- The Deployment manifest targeted a `production` namespace that the post never created, while later commands assumed the default namespace. Removed the namespace so the example works as written.
- The Job example set `parallelism: 5` without `completions`, which makes it a work-queue-style Job rather than a fixed five-pod batch run. Added `completions: 5` so it actually creates the intended parallel workload.

## Review Notes
- The autoscaler profile is cluster-wide in AKS, not per node pool.
- AKS allows autoscaled `User` node pools to have `min_count = 0`, but autoscaling can only allow scale-to-zero; it does not force it.
- The examples still use multi-zone node pools, which is valid for a basic walkthrough. For zone-sensitive scheduling scenarios, AKS documentation recommends one similar node pool per zone plus `balance_similar_node_groups = true`.
