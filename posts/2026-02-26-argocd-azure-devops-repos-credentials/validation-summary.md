# Validation Summary: How to Configure Git Credentials for Azure DevOps Repos in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD repository credentials
- Argo CD CLI
- Kubernetes Secrets and ConfigMaps
- Azure DevOps Repos
- Azure DevOps personal access tokens
- SSH keys and known hosts
- Azure Workload Identity
- Azure DevOps service hooks / webhooks

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD repository credentials command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repocreds/
- Azure DevOps SSH key authentication documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/use-ssh-keys-to-authenticate
- Azure DevOps URL documentation: https://learn.microsoft.com/en-us/azure/devops/extend/develop/work-with-urls
- Azure DevOps personal access token documentation: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
- Azure DevOps service principals and managed identities documentation: https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity

## Issues Found
- Corrected the PAT username guidance. Argo CD and Azure DevOps require a non-empty username when using access tokens as HTTP basic authentication, so the statement that an empty string works was removed.
- Updated SSH key generation from generic `rsa -b 4096` to `rsa-sha2-256`, matching Azure DevOps documentation for RSA SHA-2 key types.
- Corrected the private key example header from legacy PEM RSA format to OpenSSH private key format, which is what the documented `ssh-keygen` command produces.
- Replaced the bare `ssh-keyscan` instruction and hard-coded known-host examples with the Argo CD-supported `argocd cert add-ssh --batch` command and a declarative placeholder for the scanned Azure DevOps host key.
- Replaced the inaccurate managed identity sidecar/PAT-generation guidance. Current Argo CD supports Azure Repos with Azure Workload Identity using `useAzureWorkloadIdentity: "true"` or `--use-azure-workload-identity`; Azure DevOps managed identities also cannot create PATs.
- Corrected Azure DevOps webhook secret configuration. Argo CD expects Azure DevOps webhook basic authentication values in `argocd-secret` as `webhook.azuredevops.username` and `webhook.azuredevops.password`, not `webhook.azuredevops.secret` in `argocd-cm`.

## Review Notes
The remaining examples are technically consistent with current Argo CD and Azure DevOps documentation. Azure DevOps Server installations can vary by version and local authentication policy, so on-premises examples may still need local validation against the organization's server version and certificate configuration.
