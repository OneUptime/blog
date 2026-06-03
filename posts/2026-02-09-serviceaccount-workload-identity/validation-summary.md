# Validation Summary: How to Use ServiceAccount Annotations for Workload Identity Federation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes ServiceAccounts and projected ServiceAccount tokens
- AWS EKS IAM Roles for Service Accounts (IRSA)
- Google Kubernetes Engine Workload Identity Federation
- Microsoft Entra Workload ID for AKS
- Kubernetes mutating admission webhooks
- OPA Gatekeeper constraints

## Sources Consulted
- Amazon EKS: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS: Configure the AWS STS endpoint for a service account: https://docs.aws.amazon.com/eks/latest/userguide/configure-sts-endpoint.html
- AWS EKS Pod Identity Webhook documentation: https://github.com/aws/amazon-eks-pod-identity-webhook
- Google Cloud: About Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Microsoft Learn: Use a Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Azure CLI reference for az login: https://learn.microsoft.com/en-us/cli/azure/reference-index
- Kubernetes documentation: Projected Volumes: https://kubernetes.io/docs/concepts/storage/projected-volumes
- Gatekeeper Library: Required Annotations: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredannotations

## Issues Found
- The AWS `eks.amazonaws.com/token-expiration` annotation was described as controlling AWS credential lifetime. Updated it to describe the projected ServiceAccount token lifetime that STS validates.
- The Azure setup mixed an Entra application registration with a user-assigned managed identity and created an unused managed identity. Reworked the example to use the current Microsoft Learn managed identity flow with `az identity federated-credential create`.
- The Azure pod example used `az storage` as though Azure CLI automatically consumed workload identity. Updated it to run `az login --service-principal --federated-token` using the injected environment variables and token file, then call storage with `--auth-mode login`.
- The Azure explanatory text said only that the label injects environment variables. Updated it to include the projected token file and clarify that Azure SDKs use the injected values through `DefaultAzureCredential`.
- The custom mutating webhook sample had unused imports, an undefined `saAnnotations` variable, an unused `saName` variable, JSON Patch paths that would fail when `env` or `volumes` arrays were missing, and no container mount for the projected token. Fixed the snippet so it is syntactically consistent and mounts the projected token.
- The Gatekeeper example implied that `K8sAllowedAnnotations` is available by default. Added a qualification that a matching `ConstraintTemplate` must be installed.

## Review Notes
The GCP section uses the IAM service account impersonation form of Workload Identity Federation for GKE. Current GKE docs also support granting IAM roles directly to Kubernetes ServiceAccount principals without IAM service account impersonation; that would be a useful future expansion but was not required to correct this post.
