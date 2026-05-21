# Validation Summary: How to Authenticate with ArgoCD API Using Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD API authentication
- Argo CD CLI
- Argo CD AppProject roles and JWT tokens
- Kubernetes ConfigMaps and Secrets
- OIDC / SSO authentication
- curl, jq, awk, xargs

## Sources Consulted
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Security / Authentication docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/security/
- Argo CD User Management / OIDC docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD Projects docs: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD `argocd proj role list-tokens` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_list-tokens/
- Argo CD `argocd proj role delete-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_delete-token/
- Argo CD v3.4.1 source for project role token CLI behavior: https://github.com/argoproj/argo-cd/blob/v3.4.1/cmd/argocd/commands/project_role.go
- Argo CD v3.4.1 API client type for project token creation: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/pkg/apiclient/project

## Issues Found
- The session duration ConfigMap key was incorrect. Changed `server.sessionDuration` to `users.session.duration`, which is the key documented in `argocd-cm`.
- The project token API example sent `expiresIn` as a string. Changed it to a numeric JSON value because Argo CD's `ProjectTokenCreateRequest.expiresIn` is an integer duration in seconds.
- The rotation script used `argocd proj role delete-token --all`, but the current CLI does not provide a `--all` flag. Replaced it with `argocd proj role list-tokens --unixtime`, `awk`, and `xargs` to pass issued-at timestamps to `delete-token`.
- The rotation script used `argocd proj role create-token -o json`, but `create-token` does not support `-o json`. Replaced it with `--token-only`, which is the documented script-friendly output flag.
- The JWT inspection command used plain `base64 -d` against a JWT segment, which may fail because JWTs use base64url encoding. Replaced it with a `jq` command that converts URL-safe characters before decoding.
- The SSO/OIDC example used a generic client-credentials access token. Updated it to describe and extract an OIDC ID token from an authorization-code exchange, aligning the example with Argo CD's SSO token verification model.

## Review Notes
- The examples still use `curl -k` for brevity against a sample endpoint. For production use, certificate verification should remain enabled and the server's CA chain should be trusted.
- The project role token deletion flow depends on issued-at timestamps, even though newer token creation output also shows a JWT ID. This matches the current `delete-token` command behavior.
