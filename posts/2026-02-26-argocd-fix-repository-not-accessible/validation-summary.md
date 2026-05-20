# Validation Summary: How to Fix 'repository not accessible' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Git repositories and credentials
- SSH known hosts
- TLS certificate trust
- Kubernetes Secrets, ConfigMaps, Deployments, and kubectl
- GitHub, GitLab, Azure DevOps, and AWS CodeCommit authentication

## Sources Consulted
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD `argocd cert` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert/
- Argo CD `argocd cert add-ssh` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_add-ssh/
- Argo CD `argocd cert add-tls` command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_cert_add-tls/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/private-repositories/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab deploy token documentation: https://docs.gitlab.com/user/project/deploy_tokens/
- Microsoft Azure DevOps PAT documentation: https://learn.microsoft.com/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate

## Issues Found
- The SSH known host command showed `ssh-keyscan github.com` but then used `--from /path/to/known_hosts`, which did not create the referenced file. Changed it to write the scan result to `/tmp/github_known_hosts` and pass that file to `argocd cert add-ssh --batch --from`.
- The standalone `argocd-ssh-known-hosts-cm` and `argocd-tls-certs-cm` ConfigMap examples omitted the `app.kubernetes.io/part-of: argocd` label. Argo CD's declarative setup documentation warns that Argo CD ConfigMaps should include this label, so it was added to both examples.

## Review Notes
The main Argo CD repository, credential template, SSH private key, TLS certificate, GitHub App, and custom SSH port commands match current Argo CD documentation. The post uses placeholder tokens and repository URLs; these are syntactically plausible examples, but real deployments should avoid placing tokens in shell history or Git clone URLs when safer credential handling is available.
