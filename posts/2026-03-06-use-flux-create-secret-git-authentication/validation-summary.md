# Validation Summary: How to Use flux create secret git for Git Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CLI
- Flux Source Controller
- Kubernetes Secrets
- GitRepository custom resources
- Git authentication over HTTPS and SSH
- GitHub, GitLab, and Bitbucket authentication tokens
- SOPS

## Sources Consulted
- Flux CLI documentation for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux generic Git server bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- GitHub Docs, Managing personal access tokens: https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
- GitLab Docs, Personal access tokens: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab Docs, OAuth 2.0 identity provider API: https://docs.gitlab.com/api/oauth2/
- Atlassian Support, Bitbucket app passwords: https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/

## Issues Found
- The introduction claimed the guide covers "all authentication scenarios," but Flux supports additional HTTP/S patterns such as bearer token, CA, and mutual TLS secrets. Changed this to "common authentication scenarios" to avoid overstating the scope.
- The authentication overview listed "OAuth Token" as a top-level HTTPS method. Flux documents bearer token authentication separately, while popular Git servers such as GitHub, GitLab, and Bitbucket generally use OAuth/PAT-style tokens as the password in basic access authentication. Changed the node label to "Bearer Token."
- The export section said the command exports the "secret creation command" as YAML. `--export` outputs the generated Kubernetes Secret manifest. Updated the wording accordingly.

## Review Notes
- The local environment did not have the `flux` or `kubectl` binaries installed, so CLI verification was performed against official Flux documentation instead of local `--help` output.
- The Flux GitRepository example uses `source.toolkit.fluxcd.io/v1`, `spec.secretRef.name`, and valid `spec.ref.branch` syntax.
- The SSH examples use valid Flux URL form with `ssh://`, which is required instead of scp-like Git SSH syntax.
- Token permission examples are provider-dependent, but the stated GitHub, GitLab, and Bitbucket patterns are consistent with official provider documentation for repository read access.
