# Validation Summary: How to Build Kubernetes Service Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- Kubernetes projected service account tokens
- kubectl
- AWS EKS IAM Roles for Service Accounts (IRSA)
- Google Kubernetes Engine Workload Identity Federation
- Azure Kubernetes Service Microsoft Entra Workload ID

## Sources Consulted
- Kubernetes documentation: Service Accounts - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: Projected Volumes - https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes documentation: kubectl create secret docker-registry - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- AWS documentation: Assign IAM roles to Kubernetes service accounts - https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Google Cloud documentation: Authenticate to Google Cloud APIs from GKE workloads - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster

## Issues Found
- The post said Kubernetes 1.20+ uses bound service account tokens by default. Kubernetes documentation states that v1.22 and later use short-lived, automatically rotating TokenRequest tokens by default for Pods. Changed the version reference to Kubernetes 1.22+.
- The complete RBAC example used `resourceNames` with `list` and `watch` for ConfigMaps. Kubernetes allows this only when list/watch requests include a matching `metadata.name` field selector, which ordinary clients often do not use. Changed the ConfigMap rule to `get` only, matching the stated goal of reading named ConfigMaps.
- The JWT decode command used plain `base64 -d` directly on a JWT segment. JWT payloads are base64url encoded and often omit padding. Updated the command to translate URL-safe characters and restore padding before decoding.

## Review Notes
- The GKE example uses the IAM service account impersonation pattern. Current GKE docs recommend direct IAM principal identifiers for supported APIs, while still documenting IAM service account linking as an alternative for compatibility.
- The GKE `nodeSelector` is appropriate for Standard clusters with Workload Identity Federation node pools, but GKE Autopilot clusters reject that selector because all nodes use the metadata server.
