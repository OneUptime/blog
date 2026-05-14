# Validation Summary: How to Configure GitRepository with Azure DevOps Repos in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux notification-controller
- Kubernetes GitRepository custom resources
- Kubernetes Receiver custom resources
- Kubernetes Secrets
- Azure DevOps Repos
- Azure DevOps personal access tokens
- Azure DevOps SSH public keys
- Azure Workload Identity
- kubectl
- Flux CLI
- ssh-keygen

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Microsoft Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Microsoft Learn, Use SSH key authentication with Azure Repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/use-ssh-keys-to-authenticate
- Microsoft Learn, Authenticate with your Git repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/auth-overview
- Microsoft Learn, Use personal access tokens: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
- Microsoft Learn, Manage personal access tokens using policies: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/manage-pats-with-policies-for-administrators

## Issues Found
- The introduction described Azure DevOps SSH authentication as using "deploy keys." Azure DevOps documents user-associated SSH public keys rather than GitHub-style deploy keys, so the wording now says "Azure DevOps SSH public keys."
- The SSH key generation example used `ssh-keygen -t rsa`, while current Azure DevOps SSH documentation recommends RSA-SHA2 algorithms for RSA keys and warns about `ssh-rsa` deprecation. Updated the command to `ssh-keygen -t rsa-sha2-256 -b 4096 ...`.
- The SSH troubleshooting note framed ED25519 as the main fallback issue. Updated it to focus on Azure DevOps RSA key support and `ssh-rsa` deprecation warnings, with guidance to use `rsa-sha2-256` or `rsa-sha2-512`.

## Review Notes
- The Flux `GitRepository` examples use `apiVersion: source.toolkit.fluxcd.io/v1`, `secretRef`, `interval`, `timeout`, and HTTPS/SSH URL forms consistent with Flux documentation.
- The HTTPS PAT secret keys `username` and `password` match Flux basic authentication requirements; Azure DevOps Git operations allow any non-empty username with a PAT used as the password.
- The `provider: azure` GitRepository example is consistent with Flux documentation for Azure DevOps Workload Identity. In a complete production setup, the Azure DevOps organization must be connected to Microsoft Entra, the managed identity must be added to Azure DevOps with repository permissions, and the source-controller must be configured for workload identity.
- The generic Flux Receiver example is valid for triggering reconciliation from Azure DevOps service hooks. The token is used to generate the webhook path for generic receivers; HMAC validation would require a receiver type that supports it.
- Local `flux` and `kubectl` binaries were not installed in this environment, so those CLI examples were checked against official documentation rather than local help output.
