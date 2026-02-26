# How to Rate Limit and Secure ArgoCD API Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API Security, Rate Limiting

Description: Secure your ArgoCD API with rate limiting, authentication hardening, RBAC policies, network policies, and API gateway integration to prevent abuse and unauthorized access.

---

The ArgoCD API server is the gateway to your entire deployment infrastructure. Anyone with API access can view application configurations, trigger syncs, or even delete applications. In production, you need layered security: strong authentication, fine-grained authorization, rate limiting to prevent abuse, and network controls to restrict who can reach the API.

This post covers practical approaches to securing and rate-limiting ArgoCD API access.

## Authentication Hardening

Start by locking down how users and services authenticate with ArgoCD.

### Disable the Admin Account

The default admin account is a security risk. After setting up SSO or local accounts, disable it.

```yaml
# argocd-cm - disable admin account
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Disable the built-in admin account
  admin.enabled: "false"
  # Configure SSO (example with OIDC)
  oidc.config: |
    name: Okta
    issuer: https://company.okta.com
    clientID: argocd-client-id
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
```

### Create Dedicated Service Accounts

For automation and CI/CD integration, create dedicated accounts with API key access instead of sharing human credentials.

```yaml
# argocd-cm - create service accounts
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # CI/CD bot account - API key only
  accounts.ci-bot: apiKey
  accounts.ci-bot.enabled: "true"

  # Monitoring account - API key only
  accounts.monitoring-bot: apiKey
  accounts.monitoring-bot.enabled: "true"

  # Slack bot account - API key only
  accounts.slack-bot: apiKey
  accounts.slack-bot.enabled: "true"
```

Generate tokens with expiration.

```bash
# Generate a token that expires in 24 hours for CI
argocd account generate-token --account ci-bot --expires-in 24h

# Generate a long-lived token for monitoring (rotate regularly)
argocd account generate-token --account monitoring-bot --expires-in 720h
```

## Fine-Grained RBAC

ArgoCD's RBAC system controls what each user or service account can do. Define policies that follow the principle of least privilege.

```yaml
# argocd-rbac-cm - detailed RBAC policies
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Default policy: deny everything
  policy.default: role:none

  policy.csv: |
    # CI bot: can sync and get apps in specific projects only
    p, role:ci-bot, applications, get, ci-*/*, allow
    p, role:ci-bot, applications, sync, ci-*/*, allow
    p, role:ci-bot, applications, action, ci-*/*, allow
    p, role:ci-bot, applications, create, */*, deny
    p, role:ci-bot, applications, delete, */*, deny

    # Monitoring bot: read-only access to everything
    p, role:monitoring, applications, get, */*, allow
    p, role:monitoring, repositories, get, *, allow
    p, role:monitoring, clusters, get, *, allow
    p, role:monitoring, projects, get, *, allow
    p, role:monitoring, logs, get, */*, allow

    # Developer role: can sync their own projects
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, team-*/*, allow
    p, role:developer, applications, action, team-*/*, allow
    p, role:developer, logs, get, team-*/*, allow
    p, role:developer, applications, delete, */*, deny

    # Admin role: full access (use sparingly)
    p, role:admin, *, *, */*, allow

    # Map accounts to roles
    g, ci-bot, role:ci-bot
    g, monitoring-bot, role:monitoring
    g, slack-bot, role:developer

    # Map SSO groups to roles
    g, engineering-team, role:developer
    g, platform-team, role:admin
```

## Rate Limiting with an API Gateway

ArgoCD does not have built-in rate limiting, so you need to add it externally. The most common approach is putting an API gateway or reverse proxy in front of the ArgoCD API server.

### Using NGINX Ingress Rate Limiting

```yaml
# Ingress with NGINX rate limiting annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    # Rate limit: 10 requests per second per IP
    nginx.ingress.kubernetes.io/limit-rps: "10"
    # Burst buffer: allow short bursts up to 20
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"
    # Rate limit on connections
    nginx.ingress.kubernetes.io/limit-connections: "5"
    # Custom error when rate limited
    nginx.ingress.kubernetes.io/limit-req-status-code: "429"
    # Use the real client IP for rate limiting
    nginx.ingress.kubernetes.io/use-forwarded-headers: "true"
    # SSL passthrough for gRPC
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - argocd.company.com
      secretName: argocd-tls
  rules:
    - host: argocd.company.com
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

### Using Istio Rate Limiting

If you run Istio, use EnvoyFilter for more granular rate limiting.

```yaml
# Rate limit based on path and authentication
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: argocd-ratelimit
  namespace: argocd
spec:
  workloadSelector:
    labels:
      app.kubernetes.io/name: argocd-server
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: argocd_rate_limit
              token_bucket:
                max_tokens: 100
                tokens_per_fill: 50
                fill_interval: 60s
              filter_enabled:
                runtime_key: local_rate_limit_enabled
                default_value:
                  numerator: 100
                  denominator: HUNDRED
              filter_enforced:
                runtime_key: local_rate_limit_enforced
                default_value:
                  numerator: 100
                  denominator: HUNDRED
```

## Network Policies

Restrict which pods can communicate with the ArgoCD API server.

```yaml
# NetworkPolicy - restrict API server access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-access
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - port: 8080
          protocol: TCP
    # Allow from CI/CD namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ci-cd
      ports:
        - port: 8080
          protocol: TCP
    # Allow from monitoring namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - port: 8082
          protocol: TCP
    # Allow internal ArgoCD components
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: argocd
```

## API Audit Logging

Track every API call for security auditing. Enable ArgoCD's audit logging and forward to your SIEM.

```yaml
# argocd-cmd-params-cm - enable detailed logging
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable server audit logging
  server.log.level: "info"
  # Log format for structured logging
  server.log.format: "json"
```

ArgoCD logs API requests including the authenticated user, the action, and the resource. Forward these to your logging infrastructure.

```yaml
# Example: Fluent Bit config to forward ArgoCD audit logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-argocd
  namespace: argocd
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/argocd-server-*.log
        Parser            json
        Tag               argocd.server
        Refresh_Interval  5

    [FILTER]
        Name    grep
        Match   argocd.server
        Regex   msg (authenticated|created|updated|deleted|synced)

    [OUTPUT]
        Name            es
        Match           argocd.server
        Host            elasticsearch.logging.svc
        Port            9200
        Index           argocd-audit
        Type            _doc
```

## Token Rotation

Automate API token rotation to reduce the window of exposure if a token is compromised.

```bash
#!/bin/bash
# rotate-tokens.sh
# Rotate ArgoCD service account tokens on a schedule
# Run this as a Kubernetes CronJob

ACCOUNTS=("ci-bot" "monitoring-bot" "slack-bot")

for account in "${ACCOUNTS[@]}"; do
  echo "Rotating token for $account"

  # Generate new token (expires in 72 hours)
  NEW_TOKEN=$(argocd account generate-token \
    --account "$account" \
    --expires-in 72h 2>/dev/null)

  if [ $? -eq 0 ]; then
    # Store the new token in a Kubernetes secret
    kubectl create secret generic "argocd-token-${account}" \
      --from-literal=token="$NEW_TOKEN" \
      --namespace=argocd \
      --dry-run=client -o yaml | kubectl apply -f -

    echo "Token rotated for $account"
  else
    echo "Failed to rotate token for $account"
  fi
done
```

```yaml
# CronJob to rotate tokens weekly
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-token-rotation
  namespace: argocd
spec:
  schedule: "0 3 * * 0"  # Every Sunday at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-token-rotator
          containers:
            - name: rotator
              image: company/argocd-token-rotator:v1.0.0
              command: ["/bin/bash", "/scripts/rotate-tokens.sh"]
          restartPolicy: OnFailure
```

## Monitoring API Usage

Track API usage patterns to detect anomalies and unauthorized access attempts.

```promql
# Rate of API requests by user
sum by (grpc_method) (rate(grpc_server_handled_total{grpc_service="application.ApplicationService"}[5m]))

# Failed authentication attempts
sum(rate(grpc_server_handled_total{grpc_code="Unauthenticated"}[5m]))

# Rate of requests by client
sum by (grpc_method) (rate(grpc_server_handled_total[5m])) > 10
```

## Wrapping Up

Securing the ArgoCD API requires defense in depth: disable default accounts and use SSO with dedicated service accounts, enforce least-privilege RBAC for every account and role, add rate limiting through an API gateway or service mesh, restrict network access with Kubernetes NetworkPolicies, enable audit logging and forward to your SIEM, and automate token rotation. These layers work together to protect your deployment infrastructure while still allowing the automation and integrations that make ArgoCD powerful.
