# Validation Summary: How to Troubleshoot AKS Pod Scheduling Failures Due to Resource Constraints

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes scheduler
- Kubernetes pods, nodes, taints, tolerations, node affinity, and topology spread constraints
- Kubernetes resource requests, limits, allocatable resources, and PriorityClass
- Azure CLI for AKS node pool scaling and autoscaling
- kubectl and jq command-line usage

## Sources Consulted
- Kubernetes documentation: Scheduling, Preemption and Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Node Status, Capacity and Allocatable - https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes documentation: Reserve Compute Resources for System Daemons - https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API reference: PriorityClass v1 - https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes reference: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Microsoft Learn: Scale node pools in AKS - https://learn.microsoft.com/en-us/azure/aks/scale-node-pools
- Microsoft Learn: Azure CLI az aks nodepool reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Microsoft Learn: Azure CLI az aks reference, maxPods defaults - https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Add an Azure Spot node pool to AKS - https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: Configure kubenet networking in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn: Configure AKSNodeClass resources for Node Auto-Provisioning - https://learn.microsoft.com/en-us/azure/aks/node-autoprovision-aksnodeclass

## Issues Found
- The resource diagnostics command comments incorrectly described `kubectl describe nodes | grep -A 5 "Allocated resources"` as checking node capacity, and the custom-columns command as showing requests and limits. Updated the comments and fields so they accurately describe requested resources and allocatable CPU/memory.
- The explanation of available capacity said to subtract requests from running pods. Updated it to refer to pods scheduled to the node, which better matches scheduler behavior.
- The topology spread constraint example said a full zone always prevents scheduling into other zones. Updated it to describe the actual failure mode: the zone with the fewest matching pods has no eligible capacity, and scheduling elsewhere would exceed allowed skew.
- The AKS maxPods defaults were incorrect. Updated them to the current documented defaults: 30 for Azure CNI standard networking, 110 for kubenet, and 250 for Azure CNI overlay.
- The jq pod-count command included unscheduled pods under a null node bucket. Added `select(.spec.nodeName != null)` so it counts only pods assigned to nodes.

## Review Notes
The Azure CLI was not installed in the local workspace, so AKS command syntax was verified against Microsoft Learn CLI references instead of local `az --help` output. The post remains a practical troubleshooting guide and is technically valid after the corrections above.
