# Validation Summary: How to Configure AKS Node Pool Labels and Taints for Workload Isolation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes node labels
- Kubernetes node taints and pod tolerations
- Kubernetes nodeSelector and node affinity
- Kubernetes Deployments and Jobs

## Sources Consulted
- Microsoft Learn: Use labels in an Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/use-labels
- Microsoft Learn: Use node taints in an Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/use-node-taints
- Microsoft Learn: az aks nodepool command reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Manage system node pools in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Kubernetes Documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The post described `az aks nodepool update --labels ...` as adding labels to an existing node pool. Microsoft documentation states that updating labels on an existing AKS node pool overwrites the old labels. I changed the wording to "Replace labels on an existing node pool" and added a short note to include all labels that should be retained.
- The workload-type isolation example treated the existing system node pool as the general-purpose application pool. Microsoft AKS documentation says system node pools are primarily for critical system pods and should not be used for application workloads. I changed the example to create a separate untainted user node pool for general workloads.
- The environment isolation example said no taints were needed for a production node pool "if it is the default" while the command was adding a new user node pool. I changed the comment to describe the actual command: labeling the production node pool for production workloads.

## Review Notes
The remaining Azure CLI flags, taint formats, label formats, Kubernetes `nodeSelector`, node affinity, toleration examples, taint effects, and verification commands align with current official documentation. The Azure CLI was not installed in the workspace, so CLI validation was performed against Microsoft Learn command reference and AKS documentation instead of local `az --help` output.
