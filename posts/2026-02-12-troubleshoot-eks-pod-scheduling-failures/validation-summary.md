# Validation Summary: How to Troubleshoot EKS Pod Scheduling Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon EKS
- Kubernetes scheduling
- kubectl
- Kubernetes resource requests
- Node selectors and node affinity
- Taints and tolerations
- PersistentVolumes and StorageClasses
- Pod topology spread constraints
- Amazon VPC CNI prefix delegation

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Amazon EKS, Assign more IP addresses to Amazon EKS nodes with prefixes: https://docs.aws.amazon.com/eks/latest/userguide/cni-increase-ip-addresses.html
- Amazon EKS Best Practices, Prefix Mode for Linux: https://docs.aws.amazon.com/eks/latest/best-practices/prefix-mode-linux.html
- Amazon EKS Best Practices, Security Groups Per Pod: https://docs.aws.amazon.com/eks/latest/best-practices/sgpp.html

## Issues Found
- The resource diagnostic comment described `kubectl top nodes` as showing allocatable versus requested resources. `kubectl top nodes` reports current resource usage from the Metrics API, so the comment was corrected.
- The pod-capacity command labeled `.status.allocatable.pods` as `USED`, but that field is allocatable pod capacity, not the number of pods currently running. The column was renamed to `ALLOCATABLE`.
- The prefix delegation fix implied that setting VPC CNI environment variables alone significantly increases the Kubernetes pod limit. AWS documents that kubelet `max-pods` must also reflect the intended limit and existing nodes may need replacement, so the guidance was corrected.

## Review Notes
The remaining commands and configuration snippets are technically valid for current Kubernetes and EKS usage. `kubectl top nodes` requires metrics collection to be installed, and event wording can vary slightly by Kubernetes version and scheduler plugin, but the examples are representative and accurate.
