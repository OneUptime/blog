# Validation Summary: How to Use ArgoCD with Private GitHub Repos Using Deploy Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes Secrets and ConfigMaps
- GitHub deploy keys
- GitHub CLI
- SSH keys and known_hosts
- External Secrets Operator
- Sealed Secrets

## Sources Consulted
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD declarative setup and repository secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- GitHub Docs, Managing deploy keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitHub Docs, Managing personal access tokens: https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
- GitHub CLI `gh repo deploy-key add` manual: https://cli.github.com/manual/gh_repo_deploy-key_add
- External Secrets Operator `ExternalSecret` API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator advanced templating documentation: https://external-secrets.io/latest/guides/templating/

## Issues Found
- The post described personal access tokens as granting access to all user repositories. Updated this to distinguish classic broad PAT behavior from fine-grained PATs that can be scoped to selected repositories.
- The post called deploy keys the most secure option. GitHub's own deploy key guidance recommends GitHub Apps for enhanced fine-grained control, so the wording was changed to "a strong option" for single-repository Argo CD access.
- The comparison table listed GitHub App rotation as automatic. Updated it to clarify that GitHub App installation tokens are short-lived, while the app private key is still a manually managed secret.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API and added `engineVersion: v2` to match current templating documentation.
- The troubleshooting section showed an SSH command using `/tmp/test-key` inside the `argocd-repo-server` pod, but that key path would not exist there unless manually copied. Replaced it with `argocd repo get ... --refresh hard`, which is supported by the Argo CD CLI for refreshing repository connection status.

## Review Notes
The remaining Argo CD repository Secret fields, credential template label, `sshPrivateKey` key, SSH URL usage, deploy key read-only default, GitHub CLI deploy-key command, and known hosts ConfigMap guidance match the official documentation reviewed.
