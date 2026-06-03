# Validation Summary: How to Use Virtual Kubelet to Extend Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Virtual Kubelet
- Amazon EKS
- AWS Fargate
- Azure Kubernetes Service
- Azure Container Instances
- Horizontal Pod Autoscaler
- Prometheus Operator / PrometheusRule
- kube-state-metrics

## Sources Consulted
- Virtual Kubelet overview: https://virtual-kubelet.io/docs/
- Virtual Kubelet usage and Helm notes: https://virtual-kubelet.io/docs/usage/
- Amazon EKS Fargate user guide: https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- eksctl Fargate support guide: https://docs.aws.amazon.com/eks/latest/eksctl/fargate.html
- Amazon EKS Fargate profile guide: https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html
- Azure AKS virtual nodes overview: https://learn.microsoft.com/en-us/azure/aks/virtual-nodes
- Azure AKS virtual nodes CLI guide: https://learn.microsoft.com/en-us/azure/aks/virtual-nodes-cli
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The AWS Fargate section incorrectly stated that EKS automatically deploys Virtual Kubelet for Fargate profiles. Updated the section to explain that EKS uses managed Fargate controllers and Fargate profiles, and changed the verification command to inspect scheduled pods with `kubectl get pods -o wide`.
- The Azure Container Instances installation flow used outdated Virtual Kubelet Helm/manual deployment examples. Replaced it with the current AKS virtual nodes add-on flow using `az provider register`, a virtual-node subnet, and `az aks enable-addons --addons virtual-node`.
- Several Azure virtual-node workload examples lacked the tolerations expected by AKS virtual nodes. Added `virtual-kubelet.io/provider` and `azure.com/aci` tolerations where pods are intended to run on virtual nodes.
- The Cluster Autoscaler section incorrectly claimed Cluster Autoscaler can scale virtual nodes for burst capacity. Replaced it with a Horizontal Pod Autoscaler example and clarified that Cluster Autoscaler/Karpenter apply to VM-backed node groups, while virtual nodes do not require VM provisioning.
- The Prometheus usage alert divided pod count by all allocatable resources, which mixes resource types. Updated the query to divide by allocatable pod capacity using `resource="pods"` and to match both `virtual-node-*` and `virtual-kubelet*` node names.
- The cost optimization Deployment example was invalid for `apps/v1` because it lacked `spec.selector` and pod template labels. Added a matching selector and labels.
- Updated stale example node names from `virtual-kubelet-aci` to the AKS virtual-node convention `virtual-node-aci-linux`.

## Review Notes
- YAML fenced blocks were parsed locally with PyYAML after edits. `kubectl` was not available in the environment, so Kubernetes server-side dry-run validation was not performed.
- The post now distinguishes Virtual Kubelet-based ACI virtual nodes from native EKS Fargate profiles. A future revision could split AWS Fargate and Virtual Kubelet provider content into separate tutorials for more depth.
