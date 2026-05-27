# Validation Summary: How to Configure Kubernetes Cluster Autoscaler for Node Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Cluster Autoscaler
- Amazon EKS and AWS Auto Scaling Groups
- Google Kubernetes Engine
- Helm
- PodDisruptionBudget
- kubectl

## Sources Consulted
- Kubernetes Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Autoscaler AWS provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Autoscaler Helm chart documentation: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/charts/cluster-autoscaler
- Kubernetes Autoscaler releases: https://github.com/kubernetes/autoscaler/releases
- GKE cluster autoscaler documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- GKE cluster autoscaler concepts and autoscaling profiles: https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- gcloud container clusters update reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/

## Issues Found
- The AWS IAM policy omitted permissions used by the current upstream full-feature Cluster Autoscaler policy for ASG autodiscovery and dynamic EC2 instance type discovery. Added `ec2:DescribeImages` and `ec2:GetInstanceTypesFromInstanceRequirements`, and split scaling actions into their own statement to match the upstream policy structure.
- The EKS manifest pinned `cluster-autoscaler:v1.31.0`, which is outdated for a 2026 guide unless the cluster itself is Kubernetes 1.31. Updated the example to `v1.35.0` and added an inline note to match the image to the cluster's Kubernetes minor version.
- The prerequisites only mentioned IAM permissions. Added Kubernetes RBAC permissions because Cluster Autoscaler also needs in-cluster API permissions through its ServiceAccount.
- The GKE example described `optimize-utilization` as "faster scaling." Official GKE documentation describes this profile as optimizing utilization and scaling down more aggressively, so the comment was corrected.

## Review Notes
- The Cluster Autoscaler deployment snippet still assumes the referenced `cluster-autoscaler` ServiceAccount and Kubernetes RBAC bindings already exist. That is acceptable for a focused deployment excerpt, but a production manifest would normally include ServiceAccount, ClusterRole, and ClusterRoleBinding resources.
- The GKE `--min-nodes` and `--max-nodes` flags are per-zone bounds. For regional node pools where total node counts are desired, GKE 1.24 and later support `--total-min-nodes` and `--total-max-nodes`.
- The `safe-to-evict: "false"` annotation and PodDisruptionBudget example are technically correct, but both can block scale-down if used too broadly.
