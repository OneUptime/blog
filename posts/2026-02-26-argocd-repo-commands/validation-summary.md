# Validation Summary: How to Use argocd repo Commands for Repository Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD CLI
- Git repository authentication
- Helm repositories and OCI Helm registries
- Repository credential templates
- TLS and SSH repository certificates
- Kubernetes logs for Argo CD repo-server troubleshooting
- Bash and jq scripting

## Sources Consulted
- Argo CD stable command reference for `argocd repo add`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD stable command reference for `argocd repo`, including list/get/rm examples: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo/
- Argo CD stable command reference for `argocd repocreds add`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repocreds_add/
- Argo CD stable command reference for `argocd repocreds`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repocreds/
- Argo CD stable command reference for `argocd repo list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_list/
- Argo CD stable command reference for `argocd repo rm`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_rm/
- Argo CD command reference for `argocd cert add-tls`: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_cert_add-tls/
- Argo CD stable command reference for `argocd cert add-ssh`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_add-ssh/
- Argo CD stable command reference for `argocd cert list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_list/
- GitHub Docs for personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Issues Found
- The Helm TLS client certificate example used `--tls-client-key-path`, which is not an `argocd repo add` flag. Changed it to the documented `--tls-client-cert-key-path`.
- The Google Cloud Source Repositories example used a short-lived `gcloud auth print-access-token` as a stored password. Changed it to the documented Argo CD `--gcp-service-account-key-path` option.
- GitHub personal access token examples used `oauth2` as the username. Updated GitHub-specific examples to use a normal GitHub username placeholder because GitHub documents personal access tokens as password replacements for command-line authentication.
- Two shell snippets used unquoted angle-bracket placeholders in `--password` values, which would be interpreted by the shell as redirection. Changed them to environment-variable placeholders.
- The removal note said Argo CD cannot remove repositories used by applications. The current `argocd repo rm` command reference does not document that restriction, so the note was changed to warn that dependent applications will fail on later manifest fetches.

## Review Notes
- The local environment did not have the `argocd` CLI installed, so commands were verified against official Argo CD command reference pages rather than local `--help` output.
- The post intentionally uses placeholder hosts, tokens, and repository names; these are plausible examples rather than URLs expected to resolve.
