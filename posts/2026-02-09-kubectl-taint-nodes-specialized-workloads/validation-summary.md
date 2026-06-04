# Validation Summary: How to Use kubectl taint to Mark Nodes for Specialized Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes taints and tolerations
- kubectl
- Kubernetes scheduling and node affinity
- GKE node pools
- Amazon EKS node groups
- Azure Kubernetes Service node pools
- jq shell filtering

## Sources Consulted
- Kubernetes documentation: Taints and Tolerations, https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl reference: kubectl taint, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes API reference: Toleration v1, https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes reference: Well-Known Labels, Annotations and Taints, https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubeadm documentation: Control plane node isolation, https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#control-plane-node-isolation
- Google Cloud CLI reference: gcloud container node-pools create, https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Microsoft Azure CLI reference: az aks nodepool add, https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Amazon EKS User Guide: Prevent pods from being scheduled on specific nodes, https://docs.aws.amazon.com/eks/latest/userguide/node-taints-managed-node-groups.html

## Issues Found
- The post stated that taints have key, value, and effect components without noting that the value is optional. Updated the wording to say the value is optional, matching the kubectl taint reference.
- The post used the deprecated `node-role.kubernetes.io/master:NoSchedule` taint as the primary control-plane example. Updated the section to use `node-role.kubernetes.io/control-plane:NoSchedule` and kept a note that older clusters may still use the deprecated master taint.
- The AKS node pool command omitted `--resource-group`, which the Azure CLI documents as a required parameter unless a default group is configured. Added `--resource-group my-resource-group`.
- The EKS note was too narrow for current EKS managed node group taints. Updated it to mention managed node group taints or kubelet bootstrap configuration.
- Several statements implied that tolerations guarantee placement on specialized nodes. Updated them to clarify that tolerations allow scheduling onto tainted nodes, while node selectors or node affinity are needed when workloads must run only on those nodes.

## Review Notes
The post's examples use generic node names and labels, so they remain illustrative rather than copy-paste complete for every cloud environment. `kubectl` was not installed in the local environment, so CLI verification was performed against official generated kubectl documentation instead of local `--help` output.
