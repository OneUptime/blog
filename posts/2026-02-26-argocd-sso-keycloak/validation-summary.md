# Validation Summary: How to Configure SSO with Keycloak in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD / Argo CD
- Keycloak
- OpenID Connect (OIDC)
- Kubernetes ConfigMaps and Secrets
- kubectl
- ArgoCD RBAC

## Sources Consulted
- Argo CD official Keycloak SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/keycloak/
- Argo CD official user management and OIDC documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD official RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Keycloak official Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Kubernetes official kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- Corrected the legacy Keycloak issuer note from "before v18" to "before v17". Official Argo CD guidance states Keycloak releases older than 17 use the `/auth/realms/...` issuer path.
- Clarified the CLI SSO test. The post configured a confidential Keycloak client for browser login, but Argo CD's Keycloak documentation says CLI SSO requires the PKCE approach and the localhost callback URI.
- Updated the Keycloak external identity provider guidance. LDAP and Active Directory are configured through Keycloak User federation, not the Identity Providers page.
- Updated the logout URL to use Argo CD's documented `id_token_hint={{token}}` and `post_logout_redirect_uri={{logoutRedirectURL}}` placeholders.
- Replaced the OIDC self-signed certificate workaround. `argocd-tls-certs-cm` is for repository and similar server certificates; Argo CD OIDC provider trust should be configured with `rootCA` in `oidc.config`.

## Review Notes
The main OIDC, Keycloak group mapper, client secret, RBAC, and kubectl examples are otherwise consistent with the official documentation. The guide uses the common `ArgoCD` spelling, while the upstream project prefers `Argo CD`; this is editorial rather than a technical correctness issue.
