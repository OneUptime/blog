# Validation Summary: How to Document and Communicate Kubernetes Upgrade Plans to Stakeholders

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Amazon EKS
- kubectl
- Bash
- HTML
- PodDisruptionBudgets

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS cluster upgrade guide: https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html
- Amazon EKS UpdateClusterVersion API reference: https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateClusterVersion.html
- Amazon EKS managed node group update guide: https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- Amazon EKS control plane resilience: https://docs.aws.amazon.com/eks/latest/userguide/disaster-recovery-resiliency.html
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The sample used Kubernetes 1.28.5 to 1.29.0 for a February 2026 Amazon EKS upgrade and claimed that 1.28 reached end-of-life in March 2026. Amazon EKS 1.28 extended support ended in November 2025, while 1.32 standard support ends on March 23, 2026. Updated the example to upgrade from 1.32.5 to 1.33.0 and adjusted all matching report/template references.
- The plan described direct etcd backup and control-plane rollback for a `production-eks` cluster. Amazon EKS manages the control plane and does not support downgrading a cluster after upgrade. Reworded this to backup cluster state and persistent workloads, and changed rollback language to recovery/blue-green recovery language.
- The progress report attempted to list `kube-apiserver` pods in `kube-system`. That works for some self-managed clusters but not for Amazon EKS managed control planes. Replaced it with `kubectl version`, which reports client and server version information through the API server.
- The announcement template said to expect brief API server restarts. Amazon EKS documents highly available control-plane rolling updates during version updates. Updated the wording to describe highly available API server rolling updates.
- The event listing sorted by `.lastTimestamp`, an event-specific field that is less portable than metadata timestamps. Updated it to sort by `.metadata.creationTimestamp`.
- The placeholder CVE and feature examples were too specific for the revised version pair. Replaced them with general security/platform-fix and newer-API wording.

## Review Notes
The remaining Bash snippets are simple heredoc-based generators and are syntactically consistent with Bash. The `kubectl get` flags used for custom columns, field selectors, all namespaces, no headers, and sorting match current Kubernetes documentation. The examples are still templates and require a configured Kubernetes context and appropriate cluster permissions to run successfully.
