# Validation Summary: How to Use Kubernetes Service Accounts and Workload Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes projected service account tokens
- Kubernetes RBAC and audit-oriented service account practices
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- GKE Workload Identity Federation
- Microsoft Entra Workload ID on AKS
- kubectl, gcloud, jq

## Sources Consulted
- Kubernetes: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes: Service Accounts concept - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes: ServiceAccount API reference - https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/
- Kubernetes: Projected Volumes - https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes: Managing Service Accounts - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Amazon EKS: Assign IAM roles to Kubernetes service accounts - https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: About Workload Identity Federation for GKE - https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Microsoft Learn: Use Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster

## Issues Found
- The AKS workload identity example placed `azure.workload.identity/use: "true"` under the ServiceAccount metadata. Microsoft documentation requires this label on the Pod or Pod template metadata so the mutating admission webhook injects the projected token volume and Azure-specific environment variables. I updated the example to keep `azure.workload.identity/client-id` on the ServiceAccount and add a Pod manifest with the required label.
- The AKS section used the older "Azure AD Workload Identity" name. I updated the prose and comment to "Microsoft Entra Workload ID", which matches current Microsoft documentation.

## Review Notes
- Kubernetes service account fields, `automountServiceAccountToken`, projected service account token fields, and token rotation behavior were verified against current Kubernetes documentation.
- The AWS IRSA annotation and GKE IAM service account impersonation command were verified against official AWS and Google Cloud documentation.
- Local syntax validation confirmed that all YAML snippets in the post parse successfully. `kubectl` was not installed in the review environment, so CLI behavior was verified against official documentation rather than local `kubectl --help` output.
