# Validation Summary: How to Integrate ArgoCD with OAuth2 Proxy

## Status
validated

## Post Type
Technical tutorial / integration guide

## Technologies Covered
- Argo CD
- OAuth2 Proxy
- Kubernetes
- Helm
- ingress-nginx
- Google OAuth
- GitHub OAuth
- Microsoft Entra ID
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD authentication and authorization architecture: https://argo-cd.readthedocs.io/en/stable/developer-guide/architecture/authz-authn/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- OAuth2 Proxy configuration overview: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
- OAuth2 Proxy nginx integration documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/integrations/nginx/
- OAuth2 Proxy provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/
- OAuth2 Proxy Google provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/google/
- OAuth2 Proxy GitHub provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/github/
- OAuth2 Proxy Microsoft Entra ID provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/ms_entra_id/
- OAuth2 Proxy Helm chart repository and values: https://github.com/oauth2-proxy/manifests

## Issues Found
- The post claimed Argo CD can trust OAuth2 Proxy `X-Auth-Request-*` headers as an Argo CD login identity. Argo CD authenticates with its own session/token providers and does not provide generic OAuth2 Proxy header login. Updated the architecture explanation and Argo CD configuration section to describe OAuth2 Proxy as an ingress auth gate, with Argo CD anonymous access and RBAC default permissions if the UI should open without a second Argo CD login.
- The OAuth2 Proxy Helm values mixed two deployment patterns: proxying directly to Argo CD while also using ingress-nginx `auth_request`. Changed the example to `reverse_proxy = true`, `upstreams = ["static://202"]`, an explicit `redirect_url`, and `ingress.enabled: false` so it matches the later dedicated Ingress resources for `/oauth2` auth endpoints.
- The Argo CD command parameters snippet described `server.rootpath` as trusting proxy headers. `server.rootpath` is for non-root path hosting, not forwarded-header trust. Removed that setting and kept `server.insecure: "true"` for TLS termination at the proxy.
- The Google provider example used `google_group`, but OAuth2 Proxy's legacy config field is `google_groups`. Updated the snippet to `google_groups = ["argocd-users@example.com"]`.
- The Azure AD provider example used the deprecated Azure provider style. Updated it to the current Microsoft Entra ID provider name, `provider = "entra-id"`, and removed the obsolete `azure_tenant` field.
- The CLI section implied OAuth2 Proxy's browser flow could cover Argo CD CLI auth. Updated it to clarify that CLI users need Argo CD API tokens or Argo CD's own SSO flow, and added the documented `argocd login ... --sso --grpc-web` example.
- The troubleshooting section suggested checking Argo CD logs for forwarded OAuth2 Proxy auth headers. Since Argo CD does not consume those headers as login identity, changed the check to inspect OAuth2 Proxy auth logs.
- The WebSocket troubleshooting snippet set `nginx.ingress.kubernetes.io/connection-proxy-header: "keep-alive"`, which is not appropriate as a WebSocket upgrade fix. Removed it and kept the timeout annotations.

## Review Notes
The examples were checked against official documentation, but `helm` and `kubectl` were not installed in the workspace, so I could not run local `helm template` or Kubernetes dry-run validation. The corrected pattern intentionally treats OAuth2 Proxy as an access gate; per-user Argo CD RBAC still requires Argo CD SSO or local Argo CD accounts.
