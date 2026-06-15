# Validation Summary: How to Configure Repository Credentials in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repository credentials
- Git over HTTPS and SSH
- GitHub personal access tokens and GitHub Apps
- Kubernetes Secrets and ConfigMaps
- Helm repositories and OCI Helm registries
- TLS certificates and SSH known hosts
- Sealed Secrets and External Secrets Operator

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/oci/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub App private key documentation: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps

## Issues Found
- The GitHub PAT instructions said to generate a token with `repo` scope. Updated this to distinguish classic PAT `repo` scope from fine-grained PAT repository contents read access, matching current GitHub token models.
- The SSH known-hosts example only said to edit `argocd-ssh-known-hosts-cm`. Updated it to populate the `ssh_known_hosts` key, which is the key Argo CD uses for SSH host public keys.
- The custom TLS CA ConfigMap example omitted the Argo CD labels required by the declarative setup documentation for ConfigMaps. Added `app.kubernetes.io/name` and `app.kubernetes.io/part-of` labels.
- The troubleshooting command used `argocd repo add --dry-run`, but the current Argo CD command reference does not list a `--dry-run` flag for `repo add`. Replaced it with `argocd repo get ... --refresh hard` to force a connection-status refresh for an already configured repository.
- The token rotation example patched `/stringData/password` and selected every credential-template Secret, including templates without passwords. Kubernetes stores Secret values under `data`, while `stringData` is an input convenience field. Updated the command to filter for Secrets with a password key, base64-encode the new token, and patch `/data/password`.
- The least-privilege guidance for GitHub tokens was too broad. Updated it to distinguish classic PAT scope from fine-grained PAT permissions.

## Review Notes
The Argo CD declarative repository, repo credential, GitHub App, SSH key, Helm, OCI Helm, TLS client certificate, and `insecure` examples otherwise match the documented Argo CD secret fields and command behavior. The examples intentionally use placeholder tokens and private keys, so they were reviewed for field names and command syntax rather than executed against a live Argo CD instance.
