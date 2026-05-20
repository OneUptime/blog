# Validation Summary: How to Secure ArgoCD API Endpoints

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx
- Kubernetes NetworkPolicy
- OIDC/SSO
- Argo CD RBAC and API tokens
- Webhook secrets

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/tls/
- Argo CD command parameters ConfigMap: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD user management and local accounts: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD OIDC configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The ingress TLS termination example used `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` and service port `443`, but the post then instructed readers to set `server.insecure: "true"`. With Argo CD running insecure behind TLS-terminating ingress, the upstream protocol should be HTTP and the service port should be `80`. Updated both the main ingress and webhook ingress examples.
- The internal TLS example used non-current environment variable names for repo-server TLS. Replaced it with the supported `argocd-cmd-params-cm` keys: `reposerver.disable.tls`, `server.repo.server.plaintext`, and `server.repo.server.strict.tls`.
- The session configuration snippet used unsupported keys `server.session.maxDuration` and `server.session.maxCacheSize`. Replaced the timeout setting with the documented `users.session.duration` key and removed the unsupported concurrent-session setting.
- The rate limiting example described `nginx.ingress.kubernetes.io/limit-rate-after` as returning 429 responses. That annotation controls response transmission rate after a byte threshold. Replaced it with the ingress-nginx controller ConfigMap key `limit-req-status-code: "429"`.
- The Argo CD API server security header example included unsupported `server.content.security.policy` and `server.strict.transport.security` keys. Removed those from the Argo CD ConfigMap example and left those headers in the ingress configuration example.
- Removed a TLS 1.2 cipher annotation from a TLS 1.3-only ingress example because nginx's `ssl_ciphers` setting does not configure TLS 1.3 cipher suites.

## Review Notes
- ingress-nginx `configuration-snippet` works only when snippet annotations are enabled by the controller and may be restricted in hardened clusters. A future revision could prefer the documented custom headers ConfigMap pattern where possible.
- ingress-nginx is under retirement notice as of the current documentation. Existing deployments continue to work, but future posts should account for the project's maintenance status and possible migration paths.
