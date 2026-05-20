# Validation Summary: How to Configure Git Credentials for Bitbucket Server in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repository credentials and credential templates
- Bitbucket Server / Bitbucket Data Center Git repository authentication
- Kubernetes Secrets and ConfigMaps
- SSH known hosts and Git over SSH
- TLS CA certificate configuration
- Argo CD webhooks

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repocreds add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repocreds_add/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD repository Secret example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
- Atlassian Bitbucket Data Center HTTP access tokens documentation: https://confluence.atlassian.com/bitbucketserver088/http-access-tokens-1216582076.html
- Atlassian Bitbucket Server / Data Center personal access tokens documentation: https://confluence.atlassian.com/bitbucketserver077/personal-access-tokens-1026551036.html
- Atlassian Bitbucket Data Center SSH access documentation: https://confluence.atlassian.com/bitbucketserver/enable-ssh-access-to-git-repositories-776640358.html

## Issues Found
- The HTTP access token examples used `username: x-token-auth` and `password` for project/repository-scoped Bitbucket Data Center HTTP access tokens. Atlassian documents that project and repository HTTP access tokens must use Bearer authentication for Git operations, and current Argo CD supports this with `bearerToken` / `--bearer-token`. Updated the Kubernetes Secret examples, CLI examples, and troubleshooting `git ls-remote` command accordingly.
- The post stated the Bitbucket Server/Data Center webhook secret should be configured in `argocd-cm`. Argo CD stores webhook shared secrets in the `argocd-secret` Secret. Updated the YAML snippet to use `kind: Secret`, `name: argocd-secret`, and `stringData`.
- The `argocd-ssh-known-hosts-cm` and `argocd-tls-certs-cm` examples omitted the `app.kubernetes.io/part-of: argocd` label. Argo CD documentation calls out this label for ConfigMaps it consumes. Added the label to both examples.

## Review Notes
The remaining examples for Bitbucket HTTPS clone paths, SSH clone URLs on port 7999, Argo CD repository credential templates, SSH private key configuration, known-host bracket notation for non-standard SSH ports, TLS certificate host keys, and Application manifests are consistent with the referenced documentation.
