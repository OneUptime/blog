# Validation Summary: How to Configure SSO with GitLab OAuth in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD SSO and RBAC
- Dex GitLab connector
- GitLab OAuth 2.0 and OpenID Connect
- Kubernetes ConfigMaps, Secrets, and kubectl commands

## Sources Consulted
- Argo CD User Management documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD private repository TLS certificate documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Dex GitLab connector documentation: https://dexidp.io/docs/connectors/gitlab/
- Dex GitLab connector source: https://github.com/dexidp/dex/blob/master/connector/gitlab/gitlab.go
- GitLab OAuth provider documentation: https://docs.gitlab.com/integration/oauth_provider/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The GitLab.com OAuth application steps incorrectly described instance-level applications under GitLab.com. GitLab instance-wide applications are documented for GitLab Self-Managed and require administrator access. I changed the GitLab.com steps to mention user-owned applications, and moved instance-wide/admin guidance to the self-hosted section.
- The self-signed certificate Dex example used `rootCA` as a file path for the GitLab connector. The current Dex GitLab connector exposes `rootCAData`, not `rootCA`, so mounting a file and referencing `rootCA` would not work. I changed the example to store a base64-encoded CA certificate in `argocd-secret` and reference it as `rootCAData`.

## Review Notes
- `kubectl` was not installed in the local workspace, so command verification was done against the official Kubernetes generated `kubectl patch` reference.
- Argo CD documentation notes that `redirectURI` does not need to be set in Dex connector config because Argo CD supplies the callback URL automatically. The post's examples include the correct callback URL, so this is redundant rather than technically incorrect.
