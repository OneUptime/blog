# Validation Summary: How to Bootstrap Flux CD with SSH Key Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- GitHub deploy keys and personal access tokens
- GitLab deploy keys and personal access tokens
- SSH key authentication
- GitRepository source-controller resources

## Sources Consulted
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap for GitLab: https://fluxcd.io/flux/installation/bootstrap/gitlab/
- Flux generic Git server bootstrap: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux CLI reference for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CLI reference for `flux bootstrap git`: https://fluxcd.io/flux/cmd/flux_bootstrap_git/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux deploy key rotation documentation: https://fluxcd.io/flux/installation/configuration/deploy-key-rotation/

## Issues Found
- The introduction said SSH authentication eliminates the need to store passwords or tokens. I narrowed this to ongoing Git reconciliation, because bootstrap still requires provider credentials and SSH private keys are still stored as Kubernetes secrets.
- The GitHub token explanation said the token is only used during bootstrap and not for ongoing Git operations. I clarified that Flux controllers do not use the PAT for Git fetches, but GitHub deploy keys remain linked to the PAT that created them.
- The SSH key rotation command comment said deleting the secret lets Flux recreate it. I changed this to say the secret is deleted before being recreated, matching the shown `flux create secret git` command and Flux's documented manual rotation flow.

## Review Notes
- The local environment did not have the `flux` CLI installed, so CLI flags and behavior were verified against the official Flux command reference and installation documentation.
- The provider-specific bootstrap examples intentionally omit `--token-auth`; current Flux documentation shows SSH deploy key authentication is the default for `flux bootstrap github` and `flux bootstrap gitlab`, while `--token-auth` switches to HTTPS token authentication.
