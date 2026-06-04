# Validation Summary: How to Use NGINX Ingress Controller External Authentication with OAuth2 Proxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- ingress-nginx
- NGINX external authentication
- OAuth2 Proxy
- Google OAuth2
- GitHub OAuth2
- Microsoft Entra ID
- Redis-backed OAuth2 Proxy sessions

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx external OAuth authentication example: https://kubernetes.github.io/ingress-nginx/examples/auth/oauth-external-auth/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- OAuth2 Proxy configuration overview: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
- OAuth2 Proxy GitHub provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/github/
- OAuth2 Proxy Microsoft Entra ID provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/ms_entra_id/

## Issues Found
- Several `apps/v1` Deployment examples were written like complete manifests but omitted required Deployment selector and pod template labels. Added `spec.selector.matchLabels` and matching `spec.template.metadata.labels` so the manifests align with the Kubernetes `apps/v1` Deployment requirements.
- Provider-specific and advanced OAuth2 Proxy Deployment examples omitted required runnable container details such as the image, upstream, secret-backed environment variables, and port. Added these where needed so the examples are usable as full manifests rather than incomplete patches.
- The GitHub provider example restricted by organization/team but did not include an email-domain setting. Added `--email-domain=*`, matching OAuth2 Proxy's GitHub provider guidance for organization/team restrictions.
- The Azure AD example used the deprecated Azure provider flags. Updated it to the current Microsoft Entra ID provider with `--provider=entra-id` and `--oidc-issuer-url=https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0`.
- The OAuth2 Proxy deployment used the `auth` namespace before creating it. Added a Namespace manifest to the main deployment snippet.

## Review Notes
The YAML snippets parse successfully. Local `kubectl` was not available in the review environment, so Kubernetes API validation was checked against official documentation rather than with `kubectl --dry-run`.
