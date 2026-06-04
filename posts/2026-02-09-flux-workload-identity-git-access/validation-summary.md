# Validation Summary: Configure Flux Workload Identity for Secure Git Repository Access Without Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux `GitRepository`
- Flux source-controller
- Kubernetes ServiceAccounts
- AWS EKS IRSA
- AWS CodeCommit IAM permissions
- Azure AKS Workload Identity
- Azure DevOps
- GKE Workload Identity Federation
- Cloud Source Repositories
- GitHub Apps

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- AWS EKS IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- eksctl IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CodeCommit permissions reference: https://docs.aws.amazon.com/codecommit/latest/userguide/auth-and-access-control-permissions-reference.html
- Azure AKS Workload Identity documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure CLI federated credential documentation: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud Source Repositories resources page: https://docs.cloud.google.com/source-repositories/docs/resources
- Flux Google Cloud integration documentation: https://fluxcd.io/flux/integrations/gcp/

## Issues Found
- The post claimed Flux could configure secretless `GitRepository` access across AWS, Azure, and GCP. Flux `GitRepository` currently supports `generic`, `azure`, and `github` providers, and workload identity for Git is native only for Azure DevOps. Updated the introduction, AWS section, GCP section, and conclusion to make this support boundary explicit.
- The AWS section implied IRSA could make CodeCommit Git access secretless for Flux. IRSA is valid for AWS APIs, but Flux `GitRepository` has no `aws` provider. Clarified that CodeCommit still requires a supported Git credential method for `GitRepository`, and pointed readers to OCI repositories or buckets for AWS workload identity.
- The Azure `GitRepository` example omitted `spec.provider: azure`, which is required for Flux to use Azure DevOps workload identity. Added the provider field.
- The Azure workload identity setup only labeled the ServiceAccount. Azure Workload Identity requires the pod template label so the webhook injects projected tokens. Added a deployment patch command.
- The Azure federated credential command omitted the audience. Added `--audiences api://AzureADTokenExchange`.
- The GCP section implied GKE Workload Identity Federation could authenticate Flux Git clones to Cloud Source Repositories. Flux `GitRepository` has no `gcp` provider. Clarified that the sample manifest is not secretless by itself.
- The post presented Cloud Source Repositories as generally available. Google states it is unavailable to new customers unless the organization used it before June 17, 2024. Added that caveat.
- The GitHub section described a non-official OIDC helper flow. Flux supports GitHub App authentication through `provider: github` and a GitHub App secret. Replaced the helper example with the official secret format and `GitRepository` configuration.
- The token lifetime claim said all workload identity tokens are 15 minutes to 1 hour. Provider lifetimes vary, and Azure documents a 24-hour Microsoft Entra token lifetime. Reworded the claim to "provider-managed lifetimes."

## Review Notes
The post is now technically accurate, but its title remains broader than the strongest supported path. A future editorial pass could retitle it around Azure DevOps workload identity and mention AWS/GCP as limitations or related Flux source integrations.
