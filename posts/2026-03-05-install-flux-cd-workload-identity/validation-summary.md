# Validation Summary: How to Install Flux CD with Workload Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes ServiceAccounts
- OCIRepository sources
- AWS EKS IAM Roles for Service Accounts (IRSA)
- Amazon ECR
- Google Kubernetes Engine Workload Identity Federation
- Google Artifact Registry
- Azure Kubernetes Service Workload Identity
- Azure Container Registry

## Sources Consulted
- Flux Workload Identity documentation: https://fluxcd.io/flux/installation/configuration/workload-identity/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux CLI documentation for `flux reconcile source oci`: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Amazon EKS documentation for IAM OIDC providers: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Amazon EKS eksctl documentation for IAM service accounts: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Google Cloud GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Microsoft AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft AKS Workload Identity deployment documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Azure Workload Identity quick start: https://azure.github.io/azure-workload-identity/docs/quick-start.html
- Azure CLI role assignment documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The Azure role assignment used the managed identity client ID with `--assignee`. I changed the example to retrieve the managed identity `principalId` and use `--assignee-object-id` with `--assignee-principal-type ServicePrincipal`, which is the more reliable Azure CLI pattern for managed identities.
- The Azure ServiceAccount patch did not label the source-controller Deployment pod template for the Azure Workload Identity webhook. I added the Deployment patch so the webhook mutates source-controller pods and injects the projected token and Azure identity environment variables.
- The summary described the provider setup as only ServiceAccount annotation plus `provider`. I updated the Azure summary sentence to mention the required Deployment labeling.

## Review Notes
- The AWS and GCP examples align with the official Flux and cloud-provider documentation for controller-level workload identity.
- The GCP section uses the supported Kubernetes ServiceAccount-to-IAM-service-account impersonation approach. Google Cloud also documents direct IAM principal identifiers for Workload Identity Federation for GKE; that is a valid alternative but not required for this post.
- Flux supports object-level workload identity with `spec.serviceAccountName` for OCIRepository when the controller feature gate is enabled. This post uses controller-level identity instead, which is valid for the examples shown.
