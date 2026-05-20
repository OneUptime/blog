# How to Integrate ArgoCD with OAuth2 Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, OAuth2 Proxy, Authentication

Description: Learn how to put ArgoCD behind OAuth2 Proxy for centralized authentication, including configuration with various identity providers, header-based auth, and session management.

---

OAuth2 Proxy is a reverse proxy that provides authentication using OAuth2 providers like Google, GitHub, Azure AD, and others. Instead of configuring Dex inside ArgoCD for each identity provider, you can put ArgoCD behind OAuth2 Proxy and handle all authentication at the proxy layer. This is particularly useful when you already have OAuth2 Proxy deployed for other services and want a consistent authentication experience across your entire platform.

This guide covers deploying OAuth2 Proxy in front of ArgoCD and configuring both components to work together.

## Why OAuth2 Proxy Instead of Dex

There are several reasons you might prefer OAuth2 Proxy over ArgoCD's built-in Dex:

- You already use OAuth2 Proxy for other services and want consistency
- You need features Dex does not support (custom headers, IP allowlisting)
- You want to centralize authentication configuration in one place
- You need to integrate with an OAuth2 provider that Dex does not support natively
- You want additional middleware like rate limiting or bot protection before auth

## Architecture

```mermaid
graph LR
    A[User Browser] --> B[Ingress/Load Balancer]
    B --> C[OAuth2 Proxy]
    C --> D[Identity Provider]
    C --> E[ArgoCD Server]
    E --> F[ArgoCD API]
```

The user hits OAuth2 Proxy first. If not authenticated, they are redirected to the IdP. After authentication, OAuth2 Proxy allows the request through to ArgoCD. The headers can be useful for logging or upstream applications that support header auth, but ArgoCD does not use OAuth2 Proxy headers as an ArgoCD login identity.

## Deploy OAuth2 Proxy

Deploy OAuth2 Proxy using Helm:

```bash
helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
helm repo update
```

```yaml
# oauth2-proxy-values.yaml

config:
  # Client ID and secret from your OAuth2 provider
  clientID: "argocd-oauth2-client"
  clientSecret: "your-client-secret"

  # Cookie secret for session encryption (generate with: openssl rand -base64 32)
  cookieSecret: "generated-base64-secret"

  # Provider configuration (example: Google)
  configFile: |-
    provider = "google"
    email_domains = ["example.com"]
    cookie_secure = true
    cookie_domains = [".example.com"]
    cookie_samesite = "lax"
    reverse_proxy = true
    redirect_url = "https://argocd.example.com/oauth2/callback"
    upstreams = ["static://202"]
    set_xauthrequest = true
    pass_access_token = true
    pass_authorization_header = true
    skip_provider_button = true

ingress:
  enabled: false
  className: nginx
  hosts:
  - argocd.example.com
  tls:
  - secretName: argocd-tls
    hosts:
    - argocd.example.com

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

Install it:

```bash
helm install oauth2-proxy oauth2-proxy/oauth2-proxy \
  --namespace argocd \
  --values oauth2-proxy-values.yaml
```

## Configure ArgoCD Behind the Proxy

OAuth2 Proxy can gate access before requests reach ArgoCD, but ArgoCD does not support logging users in from `X-Auth-Request-*` headers. If you want the browser UI to open without a second ArgoCD login prompt, enable anonymous access and control the default permissions with ArgoCD RBAC. Keep the ArgoCD service reachable only through the protected Ingress.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com

  # Disable built-in Dex since we are using OAuth2 Proxy
  dex.config: ""

  # OAuth2 Proxy authenticates at the ingress; ArgoCD treats these requests as anonymous
  users.anonymous.enabled: "true"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Start with read-only access and add explicit roles if your workflow needs more
  policy.default: role:readonly
```

For ArgoCD to work behind a TLS-terminating proxy, configure the server to run without its own TLS and let the proxy handle HTTPS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Run ArgoCD server in insecure mode (proxy handles TLS)
  server.insecure: "true"
```

## Provider-Specific Configurations

### Google OAuth2

```ini
# OAuth2 Proxy config for Google
provider = "google"
client_id = "your-google-client-id.apps.googleusercontent.com"
client_secret = "your-google-client-secret"
email_domains = ["example.com"]
# Restrict to specific Google Workspace groups
google_groups = ["argocd-users@example.com"]
google_admin_email = "admin@example.com"
google_service_account_json = "/etc/oauth2-proxy/service-account.json"
```

### GitHub OAuth2

```ini
# OAuth2 Proxy config for GitHub
provider = "github"
client_id = "your-github-client-id"
client_secret = "your-github-client-secret"
# Restrict to GitHub org members
github_org = "your-org"
# Further restrict to specific teams
github_team = "platform-team,devops"
scope = "user:email read:org"
```

### Microsoft Entra ID

```ini
# OAuth2 Proxy config for Microsoft Entra ID
provider = "entra-id"
client_id = "your-entra-client-id"
client_secret = "your-entra-client-secret"
oidc_issuer_url = "https://login.microsoftonline.com/your-tenant-id/v2.0"
email_domains = ["example.com"]
scope = "openid email profile"
```

## Ingress Configuration

Set up the Ingress to route through OAuth2 Proxy:

```yaml
# Nginx Ingress with OAuth2 Proxy auth annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://argocd.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://argocd.example.com/oauth2/start?rd=$escaped_request_uri"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-Auth-Request-User,X-Auth-Request-Email,X-Auth-Request-Groups"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header X-Forwarded-Proto https;
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - argocd.example.com
    secretName: argocd-tls
  rules:
  - host: argocd.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80
---
# OAuth2 Proxy ingress for auth endpoints
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: oauth2-proxy-ingress
  namespace: argocd
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - argocd.example.com
    secretName: argocd-tls
  rules:
  - host: argocd.example.com
    http:
      paths:
      - path: /oauth2
        pathType: Prefix
        backend:
          service:
            name: oauth2-proxy
            port:
              number: 4180
```

## ArgoCD CLI Access

The ArgoCD CLI does not use OAuth2 Proxy's browser auth gate as an ArgoCD login. For CLI access, you have two options:

### Option 1: API Token

Create an ArgoCD API token for CLI users:

```bash
# Generate token for a specific account
argocd account generate-token --account admin
```

### Option 2: Use ArgoCD SSO with Dex Alongside OAuth2 Proxy

Keep Dex for ArgoCD SSO while using OAuth2 Proxy as an additional web UI gate. The CLI can then use ArgoCD's SSO flow:

```bash
argocd login argocd.example.com --sso --grpc-web
```

## Session Management

Configure session settings in OAuth2 Proxy for security:

```ini
# Session configuration
cookie_expire = "8h"         # Session expiry
cookie_refresh = "1h"        # Refresh session every hour
cookie_secure = true          # HTTPS only
cookie_httponly = true        # No JavaScript access
cookie_samesite = "lax"      # CSRF protection

# Redis session store for HA (optional)
session_store_type = "redis"
redis_connection_url = "redis://redis.argocd:6379"
```

## Health Checks and Monitoring

Monitor OAuth2 Proxy health alongside ArgoCD:

```yaml
# OAuth2 Proxy health check
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: oauth2-proxy
  namespace: argocd
spec:
  selector:
    matchLabels:
      app: oauth2-proxy
  endpoints:
  - port: metrics
    interval: 30s
```

Set up alerts for authentication failures and proxy errors through OneUptime to catch identity provider outages before they block your entire team from accessing ArgoCD.

## Troubleshooting

### 403 Forbidden After Authentication

Check the OAuth2 Proxy logs and confirm the user is allowed by your provider restrictions:

```bash
# Verify OAuth2 Proxy auth decisions
kubectl logs deployment/oauth2-proxy -n argocd | grep -i "auth"
```

### Redirect Loop

This usually means ArgoCD's own login is still required or the callback URL does not match the OAuth client:

```bash
# If you rely on OAuth2 Proxy plus anonymous ArgoCD UI access, ensure anonymous access is enabled
kubectl get configmap argocd-cm -n argocd -o yaml | grep users.anonymous.enabled
```

### WebSocket Connection Fails

ArgoCD uses WebSockets for log streaming. Configure the Ingress to support WebSocket upgrades:

```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```

## Conclusion

OAuth2 Proxy provides a clean separation between authentication and the ArgoCD application. By handling authentication at the proxy layer, you get a consistent SSO experience across all your platform services, centralized authentication configuration, and the ability to use any OAuth2-compatible identity provider. The main trade-off is that ArgoCD CLI access requires separate handling, typically through API tokens. For organizations already running OAuth2 Proxy for other services, this pattern reduces operational complexity by keeping all authentication configuration in one place.
