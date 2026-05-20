# Validation Summary: How to Debug SSO Login Failures in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Dex
- Kubernetes
- OpenID Connect (OIDC)
- OAuth2 SSO callback URLs
- Kubernetes Ingress
- TLS certificates
- JWT tokens
- Microsoft Entra ID / Azure AD group claims
- Auth0 custom claims

## Sources Consulted
- Argo CD SSO user management documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD Microsoft / Entra ID SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Argo CD Okta SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/okta/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/ingress/
- Argo CD CLI account command documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account/
- Kubernetes kubectl rollout restart documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Dex OpenID Connect discovery documentation: https://dexidp.io/docs/openid-connect/
- Microsoft Entra ID access token claims reference: https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Auth0 custom claims documentation: https://auth0.com/docs/troubleshoot/product-lifecycle/past-migrations/custom-claims-migration

## Issues Found
- The `argocd-secret` inspection command used `kubectl -o jsonpath='{.data}'` and then parsed the output as JSON. Kubernetes jsonpath output for an object is not guaranteed to be valid JSON, so I changed the command to use `-o json` and parse `.data` with Python.
- The manual JWT decode command used plain `base64 -d`, which often fails for JWT payloads because JWTs use base64url encoding and commonly omit padding. I replaced it with a Python `base64.urlsafe_b64decode` command that restores padding before decoding.
- The TLS fix incorrectly suggested adding an IdP CA to `argocd-tls-certs-cm`. Argo CD documents that ConfigMap for repository server TLS trust, while OIDC provider trust is configured with `rootCA` under `oidc.config`. I updated the section to show `rootCA` and noted that Dex OIDC connectors should use Dex-supported `caData` or `ca`.
- The diagnostic checklist checked `argocd-tls-certs-cm` for SSO TLS troubleshooting. I changed it to inspect OIDC TLS-related settings in `argocd-cm`, including `rootCA`, `caData`, and `oidc.tls.insecure.skip.verify`.

## Review Notes
The ingress example is technically aligned with Argo CD's documented nginx SSL passthrough pattern, though production setups may also need `ingressClassName`, `force-ssl-redirect`, and TLS secret configuration depending on the ingress controller. The callback URL guidance is correct for built-in OIDC (`/auth/callback`) and bundled Dex (`/api/dex/callback`).
