# Validation Summary: How to Fix Azure Kubernetes Service Cluster Autoscaler Not Scaling Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Cluster Autoscaler
- Azure CLI
- kubectl
- Kubernetes PriorityClass
- Kubernetes PodDisruptionBudget
- Kubernetes node selectors, taints, and tolerations

## Sources Consulted
- Microsoft Learn: Use the cluster autoscaler in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler
- Microsoft Learn: Cluster autoscaling in Azure Kubernetes Service (AKS) overview: https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler-overview
- Microsoft Learn: Azure CLI `az aks nodepool update`: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Kubernetes Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes documentation: Disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: API-initiated Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction
- Kubernetes API reference: PriorityClass v1: https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/

## Issues Found
- The post said to retrieve AKS cluster autoscaler logs with `kubectl logs -n kube-system -l app=cluster-autoscaler`. Current AKS documentation says AKS runs the autoscaler in the managed control plane, with detailed logs available through control plane logging, and recommends events plus the `cluster-autoscaler-status` ConfigMap for CLI diagnostics. I replaced the pod-log command with supported `kubectl get events` and ConfigMap commands.
- The post listed PodDisruptionBudgets as a scale-up scheduling blocker. PDBs govern voluntary evictions and can block scale-down or node drain operations, but they do not prevent the scheduler from placing new pods. I replaced that scale-up item with the AKS documented priority cutoff for pods below `-10`.
- The post said pods with `emptyDir` or `hostPath` local storage are not evicted by default. Current AKS autoscaler profile documentation lists `skip-nodes-with-local-storage` defaulting to `false`; local storage blocks scale-down only when that profile setting is true or similar behavior is configured. I updated the statement to be conditional on the autoscaler profile.
- The autoscaler profile command used multiple line-separated profile settings after `--cluster-autoscaler-profile`. Microsoft examples pass the profile as a comma-separated key/value string. I changed the command to the documented comma-separated format.
- The post said pods without resource requests leave the autoscaler with "no data to work with." That overstates the behavior. I softened it to explain that CPU or memory pressure may not trigger scaling as expected, consistent with AKS guidance that the cluster autoscaler scales based on pending pods rather than live CPU or memory pressure.

## Review Notes
The Azure CLI and Kubernetes YAML examples are otherwise current. The overprovisioning PriorityClass value of `-1` is valid and remains above AKS's documented `-10` scale-up cutoff, so placeholder pods can still trigger scale-up after preemption.
