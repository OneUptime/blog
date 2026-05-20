# Validation Summary: How to Configure SSO with Zitadel in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- OpenID Connect
- Zitadel
- Zitadel Actions
- Argo CD RBAC

## Sources Consulted
- Argo CD user management and OIDC configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/rbac/
- Argo CD JWT scope extraction source: https://github.com/argoproj/argo-cd/blob/master/util/jwt/jwt.go
- Zitadel project role and token claim documentation: https://zitadel.com/docs/apis/openidoauth/claims
- Zitadel Actions complement token documentation: https://zitadel.com/docs/apis/actions/complement-token
- Zitadel application OIDC configuration documentation: https://zitadel.com/docs/guides/integrate/login-users
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Argo CD CLI login documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_login/

## Issues Found
- The post configured Argo CD RBAC to read Zitadel's `urn:zitadel:iam:org:project:roles` claim directly. Zitadel emits project roles as an object, while Argo CD's RBAC scope extraction supports string and string-array claim values. Updated the RBAC guidance to flatten role keys into a `groups` claim with a Zitadel Action and to configure Argo CD `scopes: '[groups]'`.
- The OIDC configuration requested `urn:zitadel:iam:org:project:roles` as a scope. That value is the role claim name used in the post, not a standard OIDC scope required by Argo CD for the flattened-claim approach. Removed it from the `requestedScopes` examples.
- The project setting name "Check authorization on Authentication" did not match Zitadel's current terminology. Updated it to "Check Role Assignment on Authentication".
- The troubleshooting section used `argocd-tls-certs-cm` for a self-hosted Zitadel OIDC issuer certificate. Argo CD documents `rootCA` in `oidc.config` for OIDC provider trust. Replaced the command with the documented `rootCA` configuration pattern.
- The multi-tenancy section said to add the ArgoCD project to each organization. Zitadel handles cross-organization project access through project grants/role grants. Updated the wording to grant relevant ArgoCD project roles to each organization.

## Review Notes
The remaining examples are syntactically valid YAML, JavaScript, and shell command snippets for the described setup. The guide assumes Argo CD's built-in OIDC support and Zitadel settings that place roles into the token or userinfo data used by the custom Action.
