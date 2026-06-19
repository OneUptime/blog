# Validation Summary: How to Set Up Kubernetes Cluster Autoscaler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Cluster Autoscaler
- Amazon EKS and AWS Auto Scaling Groups
- Google Kubernetes Engine
- Kubernetes Deployments, ServiceAccounts, PriorityClasses, and HorizontalPodAutoscalers
- Prometheus alerting

## Sources Consulted
- Kubernetes Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Autoscaler README and release compatibility table: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/README.md
- AWS EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Google Kubernetes Engine cluster autoscaler guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- Google Cloud SDK `gcloud container clusters update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Kubernetes PriorityClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/

## Issues Found
- The AWS IAM policy was too broad for write operations and was missing current read permissions recommended by AWS EKS, including `autoscaling:DescribeScalingActivities`, `ec2:DescribeImages`, `ec2:GetInstanceTypesFromInstanceRequirements`, and `eks:DescribeNodegroup`. Updated the policy to scope write actions with autoscaler tags and add the missing read actions.
- The autoscaler image was pinned to `v1.28.0`, which is outdated for a current guide and could be incorrect for newer clusters. Updated the example to `v1.34.0` and added a note that the Cluster Autoscaler minor version should match the Kubernetes minor version.
- The examples used the deprecated `--scale-down-enabled=true` flag. Removed it from the deployment and configuration snippets because scale-down is enabled by default.
- The GKE examples used `--zone`; current Google Cloud documentation recommends `--location` for cluster and node-pool operations. Updated both examples.
- The expander list omitted `least-nodes` and described the `price` expander too generally. Added `least-nodes` and clarified that `price` is supported for GCE, GKE, and Equinix Metal.
- The `critical-service` Deployment snippet was invalid for `apps/v1` because it lacked `spec.selector` and matching pod template labels. Added the required selector and labels.
- The `ClusterAutoscalerNotReady` Prometheus alert used `cluster_autoscaler_last_activity == 0`, which would not reliably detect a missing or stalled autoscaler. Updated it to alert when the main activity metric is absent or stale for more than 300 seconds.

## Review Notes
The post is technically relevant and the main explanation of Cluster Autoscaler behavior, scale-up and scale-down conditions, PodDisruptionBudget handling, priority classes, and HPA interaction aligns with the official documentation. Future improvements could include showing the complete RBAC resources needed for a manual Cluster Autoscaler deployment, but the existing deployment snippet is acceptable as a focused example.
