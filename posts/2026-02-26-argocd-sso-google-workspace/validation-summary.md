# Validation Summary: How to Configure SSO with Google Workspace in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD SSO
- Dex Google connector
- Google Workspace / Google Cloud OAuth
- Google Admin SDK Directory API
- Kubernetes Secrets, ConfigMaps, and kubectl
- Argo CD RBAC
- Argo CD Helm chart values

## Sources Consulted
- Argo CD Google user management documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/google/
- Argo CD user management and OIDC configuration documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Dex Google connector documentation: https://dexidp.io/docs/connectors/google/
- Dex Google connector source: https://github.com/dexidp/dex/blob/master/connector/google/google.go
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Google Workspace domain-wide delegation documentation: https://support.google.com/a/answer/162106
- Google Admin SDK Directory API scopes documentation: https://developers.google.com/workspace/admin/directory/v1/guides/authorizing
- Google OpenID Connect documentation: https://developers.google.com/identity/openid-connect/openid-connect
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The Dex Google connector example used `adminEmail`. Current Dex documentation and source prefer `domainToAdminEmail`; `adminEmail` is still accepted but deprecated. Updated the snippet to use `domainToAdminEmail` with the `example.com` mapping.
- The domain restriction section described `allowedAudiences` as domain validation. In Argo CD OIDC configuration, `allowedAudiences` validates accepted `aud` claims, not Google Workspace hosted domains. Updated the wording to describe the snippet as explicit audience validation.

## Review Notes
The overall approach is technically sound: Google OIDC does not provide a standard `groups` claim, Dex can fetch Google group memberships through the Admin SDK using domain-wide delegation, Argo CD's Dex callback path is `/api/dex/callback`, direct OIDC uses `/auth/callback`, and Argo CD RBAC can map group or email claims with `scopes`. The direct OIDC method remains intentionally limited because it does not provide Google Groups for RBAC.
