# Validation Summary: How to Configure SSO with OpenUnison in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- OpenUnison
- Kubernetes
- OpenID Connect
- Helm
- Kubernetes Ingress
- Argo CD RBAC

## Sources Consulted
- Argo CD user management and OIDC documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD ingress and authenticating reverse proxy documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- OpenUnison custom SSO documentation: https://openunison.github.io/documentation/custom-sso/
- OpenUnison application configuration documentation: https://openunison.github.io/documentation/configuring-openunison/
- OpenUnison authentication portal deployment documentation: https://openunison.github.io/deployauth/
- Tremolo Security Argo CD deployment update: https://www.tremolo.io/post/argo-cd-deployment-update

## Issues Found
- The OpenUnison OIDC client example used a pseudo `trusts` block with fields such as `clientID`, `clientSecret`, and `mapGroups` that do not match the documented `Trust` CRD. Replaced it with a `Secret` plus an `openunison.tremolo.io/v1` `Trust` using documented fields such as `clientId`, `clientSecret.keyName`, `clientSecret.secretName`, `codeLastMileKeyName`, `redirectURI`, `signedUserInfo`, and `verifyRedirect`.
- The Argo CD issuer examples pointed to `/auth/idp/argocd` while the corrected `Trust` example extends OpenUnison's Kubernetes IdP. Updated those examples to use `/auth/idp/k8sIdp`, which is the documented issuer for the Kubernetes trust path.
- The reverse proxy section said Argo CD trusts identity information forwarded by OpenUnison. Argo CD documentation supports being placed behind authenticating reverse proxies, including CLI extra headers for proxy layers, but Argo CD still needs its own authentication mechanism such as OIDC, Dex, or local users. Updated the wording and configuration to keep OIDC as the Argo CD login mechanism.
- The OpenUnison Helm command referenced `openunison/openunison-k8s-login-argocd`, which is not the current documented chart path and the older Argo CD-specific OpenUnison chart has been deprecated. Updated the example to use the documented `tremolo` Helm repository and `tremolo/orchestra-login-portal` chart.
- The reverse proxy Helm values used unsupported-looking `services.enable_argocd` and `services.argocd` keys. Replaced them with the documented `openunison.apps` pattern using `proxyTo` and authorization groups.
- The Helm install command targeted the `openunison` namespace without ensuring it exists. Added `--create-namespace` so the command works on a fresh cluster.

## Review Notes
- The Argo CD OIDC configuration, `argocd-secret` secret reference pattern, callback URL, requested scopes, requested ID token claims, and RBAC `scopes: '[groups]'` setting align with Argo CD documentation.
- The examples still use placeholder domains, group DNs, and secrets. Operators must adapt those values to their OpenUnison deployment, upstream identity source, and Argo CD URL.
