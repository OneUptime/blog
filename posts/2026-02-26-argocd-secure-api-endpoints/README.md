# How to Secure ArgoCD API Endpoints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API Security, Networking

Description: Learn how to secure ArgoCD API endpoints including TLS configuration, authentication hardening, rate limiting, network restrictions, and API token management.

---

The ArgoCD API server is the gateway to your entire deployment infrastructure. It serves the web UI, handles CLI requests, processes webhooks, and manages application sync operations. If an attacker compromises the API server, they can deploy malicious workloads to every cluster ArgoCD manages. This guide covers how to lock down the API endpoints properly.

## Understanding ArgoCD API Endpoints

ArgoCD exposes several API endpoints:

- `/api/v1/*` - REST API for all operations
- `/api/webhook` - Webhook endpoint for Git provider notifications
- `/api/dex/*` - SSO/OIDC authentication via Dex
- `/api/badge` - Application status badges
- `/api/version` - Version information
- gRPC - CLI communication (same port as HTTP)

Each needs different security treatment.

## TLS Configuration

### Enable TLS Termination

Option 1: ArgoCD handles TLS directly:

```yaml
# The ArgoCD server uses TLS by default
# To configure custom certificates:
apiVersion: v1
kind: Secret
metadata:
  name: argocd-server-tls
  namespace: argocd
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
```

Option 2: TLS termination at the ingress (more common):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    # Force strong TLS
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
spec:
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-tls-cert
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
                  number: 443
```

When using TLS termination at the ingress, set ArgoCD to insecure mode (TLS is handled upstream):

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

### Internal TLS Between Components

Enable TLS for communication between ArgoCD components:

```yaml
# Helm values for internal TLS
server:
  env:
    - name: ARGOCD_SERVER_REPO_SERVER_TLS_INSECURE_SKIP_VERIFY
      value: "false"

repoServer:
  env:
    - name: ARGOCD_REPO_SERVER_TLS_ENABLED
      value: "true"
```

## Authentication Hardening

### Disable the Admin Account

After configuring SSO, disable the built-in admin:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  admin.enabled: "false"
```

### Configure SSO with Strong Settings

```yaml
# argocd-cm ConfigMap
data:
  url: https://argocd.example.com
  oidc.config: |
    name: Okta
    issuer: https://org.okta.com
    clientID: 0oa1234567890
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    # Enforce specific claims
    requestedIDTokenClaims:
      groups:
        essential: true
```

### Session Configuration

```yaml
# argocd-cm ConfigMap
data:
  # Short session timeout
  server.session.maxDuration: "12h"

  # Limit concurrent sessions
  server.session.maxCacheSize: "1000"
```

### API Token Best Practices

When using API tokens (for CI/CD or automation):

```bash
# Create a scoped API token for CI
argocd account generate-token --account ci-bot --expires-in 24h

# Create a project-scoped token
argocd proj role create-token production ci-deployer --expires-in 1h
```

Token management in the ConfigMap:

```yaml
# argocd-cm ConfigMap
data:
  # Define local accounts for automation
  accounts.ci-bot: apiKey
  accounts.ci-bot.enabled: "true"

  # Do NOT give login capability to service accounts
  # accounts.ci-bot: apiKey,login  # WRONG - never add login
```

RBAC for the service account:

```yaml
# argocd-rbac-cm ConfigMap
data:
  policy.csv: |
    # CI bot can only sync specific apps
    p, role:ci-bot, applications, sync, production/myapp-*, allow
    p, role:ci-bot, applications, get, production/myapp-*, allow

    # Map the account to the role
    g, ci-bot, role:ci-bot
```

## Rate Limiting

### Nginx Ingress Rate Limiting

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    # Limit requests per second per IP
    nginx.ingress.kubernetes.io/limit-rps: "10"
    # Limit concurrent connections
    nginx.ingress.kubernetes.io/limit-connections: "5"
    # Burst allowance
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "3"
    # Return 429 when rate limited
    nginx.ingress.kubernetes.io/limit-rate-after: "100"
```

### Webhook-Specific Rate Limiting

Protect the webhook endpoint separately:

```yaml
# Separate ingress for webhooks with stricter limits
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-webhooks
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "5"
    nginx.ingress.kubernetes.io/limit-connections: "2"
spec:
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-tls-cert
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /api/webhook
            pathType: Exact
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

## Network Restrictions

### Restrict API Access by IP

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  annotations:
    # Only allow access from corporate network and CI/CD
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12,203.0.113.0/24"
```

### Kubernetes Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-policy
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from ingress controller only
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
          protocol: TCP
    # Allow from ArgoCD CLI pods (if running in-cluster)
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ci
      ports:
        - port: 8080
          protocol: TCP
  egress:
    # Allow to repo server
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: argocd-repo-server
      ports:
        - port: 8081
    # Allow to Redis
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: argocd-redis
      ports:
        - port: 6379
    # Allow to Dex
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: argocd-dex-server
      ports:
        - port: 5556
    # Allow DNS
    - to: []
      ports:
        - port: 53
          protocol: TCP
        - port: 53
          protocol: UDP
    # Allow to Kubernetes API
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443
```

## Security Headers

Configure the API server to return security headers:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.x.frame.options: "DENY"
  server.content.security.policy: "frame-ancestors 'none'"
  server.strict.transport.security: "max-age=31536000; includeSubDomains"
```

Or via ingress annotations:

```yaml
annotations:
  nginx.ingress.kubernetes.io/configuration-snippet: |
    more_set_headers "X-Frame-Options: DENY";
    more_set_headers "X-Content-Type-Options: nosniff";
    more_set_headers "X-XSS-Protection: 1; mode=block";
    more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
    more_set_headers "Content-Security-Policy: frame-ancestors 'none'";
    more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains";
```

## Webhook Security

Secure the webhook endpoint to prevent unauthorized trigger of syncs:

```yaml
# Configure webhook secrets for each Git provider
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  # GitHub webhook secret
  webhook.github.secret: <strong-random-secret>

  # GitLab webhook secret
  webhook.gitlab.secret: <strong-random-secret>

  # Bitbucket webhook secret
  webhook.bitbucket.uuid: <bitbucket-uuid>
```

## Monitoring API Security

```bash
# Check for failed authentication attempts
kubectl logs -n argocd deployment/argocd-server | grep -i "unauthorized\|forbidden\|401\|403"

# Monitor active sessions
kubectl logs -n argocd deployment/argocd-server | grep "session"

# Check for unusual API patterns
kubectl logs -n argocd deployment/argocd-server | grep "api/v1" | \
  awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
```

## Security Checklist

- [ ] TLS enabled (either on server or at ingress)
- [ ] TLS 1.3 enforced
- [ ] Admin account disabled
- [ ] SSO configured
- [ ] Short session timeouts
- [ ] API tokens are scoped and expire
- [ ] Rate limiting configured
- [ ] IP-based access restrictions
- [ ] Network policies in place
- [ ] Security headers configured
- [ ] Webhook secrets configured
- [ ] Internal TLS between components

For more on ArgoCD authentication, see our guide on [ArgoCD SSO with Dex](https://oneuptime.com/blog/post/2026-02-02-argocd-sso-dex/view) and [ArgoCD API token authentication](https://oneuptime.com/blog/post/2026-02-26-argocd-api-token-authentication/view).
