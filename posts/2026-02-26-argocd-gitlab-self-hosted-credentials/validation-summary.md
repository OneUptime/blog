# Validation Summary: How to Configure Git Credentials for GitLab Self-Hosted in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitLab Self-Managed
- Kubernetes Secrets and ConfigMaps
- Git over HTTPS
- SSH deploy keys and known hosts
- TLS CA certificate configuration
- GitLab webhooks

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repocreds add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repocreds_add/
- GitLab deploy tokens documentation: https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab group access tokens documentation: https://docs.gitlab.com/user/group/settings/group_access_tokens/
- GitLab project access tokens documentation: https://docs.gitlab.com/user/project/settings/project_access_tokens/
- GitLab personal access tokens documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab token overview: https://docs.gitlab.com/security/tokens/

## Issues Found
- Group and project access token examples implied that the generated bot username must be used. GitLab documents that Git over HTTPS accepts any non-blank username with the access token as the password, so the examples now use `argocd` and the group-token explanation was corrected.
- The SSH known-hosts and TLS certificate ConfigMap examples were missing the `app.kubernetes.io/part-of: argocd` label. Argo CD documentation states ConfigMaps should include this label so Argo CD can use them, so both examples were updated.
- The GitLab webhook secret was shown in `argocd-cm`. Argo CD stores provider webhook secrets in the `argocd-secret` Kubernetes Secret, so the YAML snippet was corrected.
- The token-expiry guidance suggested using non-expiring tokens for service accounts too broadly. GitLab access tokens generally require expiration in current versions unless service account settings allow otherwise, so the guidance was narrowed to deploy tokens and policy-controlled service account PATs.

## Review Notes
The remaining Argo CD repository Secret formats, credential-template prefix behavior, CLI examples, GitLab deploy token guidance, SSH known-host setup, TLS CA ConfigMap structure, webhook endpoint, and troubleshooting commands are technically consistent with the consulted official documentation. Future improvements could mention the `argocd cert add-tls` and `argocd cert add-ssh` CLI alternatives, but the current declarative examples are valid.
