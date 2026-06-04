# Validation Summary: How to Configure External OIDC Provider with ServiceAccount Token

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes ServiceAccounts and projected ServiceAccount tokens
- Kubernetes ServiceAccount issuer discovery and JWKS
- OpenID Connect and JWT validation
- HashiCorp Vault Kubernetes and JWT/OIDC authentication
- AWS EKS IAM Roles for Service Accounts (IRSA)
- GKE Workload Identity Federation
- Microsoft Entra Workload ID for AKS
- Go with HashiCorp Vault API and go-oidc

## Sources Consulted
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: Projected Volumes - https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes documentation: Managing Service Accounts - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- HashiCorp Vault documentation: Kubernetes auth method API - https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault documentation: Kubernetes auth method - https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault documentation: Use Kubernetes for OIDC authentication - https://docs.hashicorp.com/vault/docs/auth/jwt/oidc-providers/kubernetes
- Amazon EKS documentation: Create an IAM OIDC provider for your cluster - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Google Cloud documentation: Authenticate to Google Cloud APIs from GKE workloads - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud documentation: Workload Identity Federation for GKE concepts - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use Microsoft Entra Workload ID with AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview

## Issues Found
- The Kubernetes issuer example used an internal service DNS name while saying external services should validate tokens against it. Updated the issuer and audience example to use a public HTTPS issuer and clarified that the discovery document and JWKS must be reachable by relying parties.
- The OIDC verification command said it fetched JWKS but fetched the discovery document again. Updated it to show the discovery document and then fetch `/openid/v1/jwks`.
- The Vault section incorrectly described the Kubernetes auth method as OIDC token validation. Updated it to describe ServiceAccount JWT validation through the Kubernetes TokenReview API and added a note to use Vault JWT auth with Kubernetes OIDC discovery when TokenReview is not reachable.
- The Vault role used deprecated/older policy and TTL parameter names and omitted the audience check for the projected `vault` audience. Updated the role to use `audience=vault`, `token_policies`, and `token_ttl`.
- The Go Vault example used deprecated `ioutil.ReadFile` and did not check for a missing auth block in the Vault response. Updated it to `os.ReadFile` and added a nil auth response check.
- The GKE cluster update command omitted an explicit location and did not account for Standard node pools needing the GKE metadata server. Added `--location=LOCATION` and a node pool metadata server update command.
- The Azure section mixed an app registration flow with an unused managed identity. Reworked the commands to use a user-assigned managed identity consistently, create the federated credential with `az identity federated-credential create`, grant permissions to the identity principal, and annotate the Kubernetes ServiceAccount with the managed identity client ID.
- The Azure naming used the old Azure AD Workload Identity terminology. Updated the section and conclusion to Microsoft Entra Workload ID.
- The custom Go OIDC validator parsed legacy flat Kubernetes ServiceAccount claim names. Updated the claims struct to match the current nested `kubernetes.io` claim schema used by bound ServiceAccount tokens.

## Review Notes
The post is technically relevant and salvageable. The cloud provider sections are still concise examples rather than complete production runbooks; future improvements could add prerequisite calls such as enabling AKS OIDC issuer/workload identity or checking whether an EKS OIDC provider already exists.
