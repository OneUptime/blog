# How to Rate Limit Flux Receiver to Prevent API Throttling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Rate Limiting, Performance, Ingress, Throttling

Description: Learn how to rate limit incoming webhook requests to the Flux Receiver to prevent API throttling, excessive reconciliations, and resource exhaustion in your cluster.

---

In high-activity repositories or environments with multiple webhook sources, the Flux Receiver can be overwhelmed with requests. Each webhook triggers a reconciliation, and if too many arrive in a short window, the source-controller and kustomize-controller can spend all their time reconciling instead of converging. Additionally, rapid-fire reconciliations can hit Git provider API rate limits, causing fetch failures.

This guide covers multiple strategies for rate limiting webhook traffic to the Flux Receiver at the Ingress layer, the Flux configuration layer, and the provider layer.

## Prerequisites

- A Kubernetes cluster with Flux CD installed.
- A Receiver exposed externally via an NGINX Ingress controller or Gateway API.
- `kubectl` and `flux` CLI tools available.
- Familiarity with NGINX Ingress annotations.

## Why Rate Limiting Matters

Consider a monorepo with 50 developers pushing frequently. Each push triggers a webhook, which triggers a reconciliation. Without rate limiting:

- The source-controller fetches the repository 50 times in rapid succession.
- Each fetch may trigger downstream Kustomization and HelmRelease reconciliations.
- GitHub API rate limits (5000 requests/hour for authenticated, 60/hour for unauthenticated) can be exhausted.
- Controller CPU and memory usage spikes, potentially affecting other workloads.

## Strategy 1: NGINX Ingress Rate Limiting

The NGINX Ingress controller supports native rate limiting through annotations. This is the most straightforward approach.

### Basic Rate Limiting

```yaml
# ingress-rate-limited.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-receiver
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Rate limiting: 5 requests per second per source IP
    nginx.ingress.kubernetes.io/limit-rps: "5"
    # Allow bursts of up to 10 requests
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"
    # Return 429 Too Many Requests when rate limit is exceeded
    nginx.ingress.kubernetes.io/limit-rate-after: "0"
    # Custom error page for rate-limited requests
    nginx.ingress.kubernetes.io/server-snippet: |
      error_page 429 @rate_limited;
      location @rate_limited {
        return 429 '{"message": "rate limit exceeded, retry later"}';
      }
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: flux-webhook-tls
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /hook/
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
```

Apply it:

```bash
kubectl apply -f ingress-rate-limited.yaml
```

### Connection-Based Rate Limiting

Limit the number of concurrent connections from a single source IP:

```yaml
annotations:
  # Maximum 10 concurrent connections per IP
  nginx.ingress.kubernetes.io/limit-connections: "10"
  # 5 requests per second
  nginx.ingress.kubernetes.io/limit-rps: "5"
  # Burst multiplier
  nginx.ingress.kubernetes.io/limit-burst-multiplier: "3"
  # Whitelist trusted IPs (e.g., GitHub webhook IPs)
  nginx.ingress.kubernetes.io/limit-whitelist: "192.30.252.0/22,185.199.108.0/22"
```

The whitelist is important if you want to exempt your webhook provider's IP ranges from rate limiting. GitHub publishes their webhook IP ranges, which you can add to the whitelist.

### Request Size Limiting

Prevent oversized payloads from consuming resources:

```yaml
annotations:
  # Limit request body size to 1MB
  nginx.ingress.kubernetes.io/proxy-body-size: "1m"
  # Set timeouts to prevent slow requests from holding connections
  nginx.ingress.kubernetes.io/proxy-read-timeout: "10"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "10"
```

## Strategy 2: Flux Resource Interval Configuration

Even if webhooks arrive rapidly, you can control how often Flux actually reconciles by configuring minimum intervals on the target resources.

### Set Minimum Reconciliation Intervals

```yaml
# gitrepository-with-interval.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/org/fleet-infra
  ref:
    branch: main
```

The `interval` field sets the minimum time between reconciliations. Even if webhooks trigger the `reconcile.fluxcd.io/requestedAt` annotation multiple times within 5 minutes, the source-controller will not re-fetch more often than this interval dictates for poll-based reconciliation. However, webhook-triggered reconciliations via annotation changes bypass the interval timer and cause immediate reconciliation.

To limit how often the annotation change triggers a real reconciliation, you need to work at the Ingress or provider layer.

### Kustomization Retry Intervals

For downstream resources, set sensible retry and reconciliation intervals:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  # Wait at least 30 seconds between retries on failure
  retryInterval: 30s
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
```

## Strategy 3: Gateway API Rate Limiting

If you use the Gateway API with an implementation that supports rate limiting (like Envoy Gateway), you can use a BackendTrafficPolicy:

```yaml
# Envoy Gateway rate limiting example
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: flux-receiver-ratelimit
  namespace: flux-system
spec:
  targetRefs:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      name: flux-receiver
  rateLimit:
    type: Global
    global:
      rules:
        - clientSelectors:
            - headers:
                - name: ":path"
                  value: "/hook/"
                  type: Distinct
          limit:
            requests: 10
            unit: Minute
```

The exact CRD and configuration depends on your Gateway API implementation.

## Strategy 4: Provider-Side Rate Limiting

Configure the webhook provider to send fewer events:

### GitHub

On GitHub, limit which events trigger the webhook:

- Select only "Pushes" instead of "Send me everything."
- Use branch filtering if your repository uses many branches but you only care about `main`.

GitHub also has a built-in throttling mechanism that coalesces rapid pushes within a short window.

### GitLab

In GitLab webhook settings, you can configure:

- Specific branch filters to only send webhooks for relevant branches.
- Push events only (exclude merge request events, tag events, and so on if not needed).

### Custom Webhook Middleware

For providers that do not support filtering, deploy a lightweight middleware that deduplicates and debounces requests:

```yaml
# webhook-debouncer deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-debouncer
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webhook-debouncer
  template:
    metadata:
      labels:
        app: webhook-debouncer
    spec:
      containers:
        - name: debouncer
          image: your-org/webhook-debouncer:latest
          ports:
            - containerPort: 8080
          env:
            # Forward to the notification-controller after debouncing
            - name: UPSTREAM_URL
              value: "http://notification-controller.flux-system.svc.cluster.local"
            # Wait 30 seconds of inactivity before forwarding
            - name: DEBOUNCE_SECONDS
              value: "30"
---
apiVersion: v1
kind: Service
metadata:
  name: webhook-debouncer
  namespace: flux-system
spec:
  selector:
    app: webhook-debouncer
  ports:
    - port: 80
      targetPort: 8080
```

Then point the Ingress to the debouncer service instead of the notification-controller directly.

## Strategy 5: Kubernetes Resource Quotas

Limit the resource consumption of Flux controllers to prevent runaway reconciliations from affecting other workloads:

```yaml
# resource-limits.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: flux-controller-quota
  namespace: flux-system
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 2Gi
    limits.cpu: "4"
    limits.memory: 4Gi
```

Also set resource limits on the controllers themselves through the Flux Kustomization patches:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 1Gi
```

## Verification

Test that rate limiting is working by sending rapid requests:

```bash
WEBHOOK_PATH=$(kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}')

# Send 20 requests rapidly
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{}' \
    https://flux-webhook.example.com$WEBHOOK_PATH)
  echo "Request $i: HTTP $STATUS"
done
```

With rate limiting configured at 5 RPS, you should see the first few requests return 200 and subsequent ones return 429.

Monitor the NGINX Ingress controller for rate limiting activity:

```bash
kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=5m | grep "limiting"
```

## Troubleshooting

### Legitimate webhooks being rate limited

If your CI/CD pipeline pushes frequently and hits the rate limit, consider whitelisting the webhook provider's IP ranges using the `limit-whitelist` annotation.

### Rate limit not taking effect

Verify the Ingress annotations are correct and the NGINX controller has reloaded its configuration:

```bash
kubectl -n ingress-nginx exec deploy/ingress-nginx-controller -- nginx -T | grep limit_req
```

### Controllers still overwhelmed despite rate limiting

If rate limiting is working at the Ingress level but controllers are still under load, check if there are other sources of reconciliation such as polling intervals that are too aggressive. Increase the `interval` on GitRepository and Kustomization resources.

### 429 errors in GitHub webhook delivery log

This is expected behavior. GitHub will retry failed deliveries automatically. The important thing is that at least some requests get through to trigger reconciliation.

## Summary

Rate limiting Flux Receivers involves multiple layers: NGINX Ingress annotations for request-level throttling, Flux resource intervals for reconciliation frequency, provider-side event filtering for reducing webhook volume, and resource quotas for protecting the cluster. The most effective approach combines Ingress-level rate limiting with sensible provider-side filtering to keep webhook traffic manageable without missing important events.
