# Validation Summary: How to Use Private Git Repositories with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repository credentials
- Kubernetes Secrets and ConfigMaps
- Git over HTTPS and SSH
- GitHub personal access tokens, deploy keys, and GitHub Apps
- GitLab project access tokens, group access tokens, and deploy tokens
- Bitbucket Cloud app passwords and SSH keys
- Azure Repos personal access tokens and SSH authentication
- Self-hosted Git TLS certificates and SSH known hosts

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- GitHub SSH key fingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab project access token documentation: https://docs.gitlab.com/user/project/settings/project_access_tokens/
- GitLab group access token documentation: https://docs.gitlab.com/user/group/settings/group_access_tokens/
- GitLab deploy token documentation: https://docs.gitlab.com/user/project/deploy_tokens/
- Bitbucket Cloud app password documentation: https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/
- Bitbucket Cloud API token documentation: https://support.atlassian.com/bitbucket-cloud/docs/api-tokens/
- Azure Repos SSH authentication documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/use-ssh-keys-to-authenticate
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The authentication overview listed OAuth App as a general Argo CD private repository authentication method. Argo CD's documented repository authentication methods include HTTPS username/password or token, SSH private key, GitHub App, Google Cloud Source credentials, Azure Workload Identity, and related repository options, but not a generic OAuth App flow for these Git providers. Removed the OAuth App column from the table.
- The `argocd-tls-certs-cm` ConfigMap example omitted the `app.kubernetes.io/part-of: argocd` label. Argo CD's declarative setup documentation says Argo CD ConfigMaps should include this label so Argo CD can use them. Added the label.
- The `argocd-ssh-known-hosts-cm` ConfigMap example omitted the `app.kubernetes.io/part-of: argocd` label. Added the label for the same reason.
- The credential rotation example created a new generic Secret containing only `password`, without the Argo CD repository label or required repository fields. Changed it to patch the existing Argo CD repository Secret's `stringData.password` value.

## Review Notes
- The remaining repository Secret fields, Argo CD CLI flags, GitHub App fields, SSH private key usage, TLS certificate ConfigMap key format, and SSH known hosts ConfigMap structure match current Argo CD documentation.
- Bitbucket Cloud documentation now describes API tokens as the long-term replacement for app passwords, but app password documentation still describes Git CLI usage for non-interactive tools. A future update could add API tokens as the preferred forward-looking option.
