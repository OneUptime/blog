# Validation Summary: How to Fix Flux CD Bootstrap Failure on Private Repository

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD CLI bootstrap
- GitHub and GitHub Enterprise
- GitLab and self-managed GitLab
- Generic Git SSH bootstrap
- Kubernetes secrets and Flux source reconciliation
- SSH deploy keys and personal access tokens

## Sources Consulted
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap for GitLab: https://fluxcd.io/flux/installation/bootstrap/gitlab/
- Flux bootstrap for generic Git servers: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux CLI `flux bootstrap` reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux CLI `flux bootstrap gitlab` reference: https://fluxcd.io/flux/cmd/flux_bootstrap_gitlab/
- Flux CLI `flux create secret git` reference: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- GitHub Docs, managing deploy keys: https://docs.github.com/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitHub Docs, authorizing personal access tokens for SAML SSO: https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-single-sign-on/authorizing-a-personal-access-token-for-use-with-single-sign-on
- GitHub CLI manual for `gh repo deploy-key list`: https://cli.github.com/manual/gh_repo_deploy-key_list

## Issues Found
- The initial GitHub organization SSH bootstrap example used `--personal` with an organization owner. Removed `--personal` from the organization example because Flux uses `--personal` for personal account repositories.
- The custom SSH key examples used `flux bootstrap github` with a private key. Changed them to `flux bootstrap git --url=ssh://... --private-key-file=...`, matching Flux's documented pattern for bootstrapping an existing repository with a pre-provisioned SSH deploy key.
- The GitHub classic token guidance implied an extra `admin:org > read:org` scope as a general requirement. Reworded it to state the documented Flux requirement that the token owner must have admin rights, and noted organization team-management permission only when team assignment is used.
- The GitHub fine-grained token guidance said `Administration: Read and Write` was always required. Corrected it to `Administration: Read-only` for HTTPS token authentication and `Read and Write` when SSH deploy keys must be managed.
- The GitLab token guidance suggested `read_repository` and `write_repository` as a more restrictive alternative. Corrected it because Flux bootstrap needs GitLab API access for bootstrap operations, so those repository-only scopes are not sufficient.
- The self-hosted SSH known-hosts example created a `known_hosts` file but did not pass it to Flux, and Flux bootstrap does not use that file in the shown command. Reworded the example to state that Flux gathers the SSH host key automatically and that `--ssh-hostname` is for a different SSH endpoint.

## Review Notes
The post is technically relevant and current after the corrections. Flux was not installed in the local environment, so CLI details were verified against the current official Flux command reference and provider bootstrap documentation instead of local `--help` output.
