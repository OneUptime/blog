# How to Expose ArgoCD with HAProxy Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, HAProxy, Ingresses

Description: Configure HAProxy Ingress Controller to expose ArgoCD with TLS termination, gRPC support, connection tuning, and high availability load balancing.

---

HAProxy is one of the most battle-tested load balancers in the industry, and its Kubernetes Ingress Controller brings that reliability to your cluster. If you are already using HAProxy for other workloads or prefer its advanced connection handling capabilities, this guide shows you how to configure it for ArgoCD with proper TLS and gRPC support.

## Why HAProxy Ingress for ArgoCD

HAProxy has been handling high-traffic production loads for over two decades. Its Kubernetes Ingress Controller brings features like:

- Advanced connection and rate limiting
- Sticky sessions and connection draining
- Detailed metrics and logging
- Proven reliability under heavy load
- Native HTTP/2 and gRPC support

For ArgoCD, HAProxy's connection handling is particularly useful because sync operations can be long-running and the UI maintains WebSocket connections for real-time updates.

## Prerequisites

- A Kubernetes cluster with ArgoCD installed
- HAProxy Ingress Controller deployed

Install HAProxy Ingress Controller:

```bash
# Add the HAProxy Helm repo
helm repo add haproxytech https://haproxytech.github.io/helm-charts
helm repo update

# Install HAProxy Ingress Controller
helm install haproxy-ingress haproxytech/kubernetes-ingress \
  --namespace haproxy-controller \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

## Configuring ArgoCD

Set the ArgoCD server to insecure mode for TLS termination at HAProxy:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Basic Ingress Configuration

Create an Ingress with HAProxy-specific annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Force HTTPS redirect
    haproxy.org/ssl-redirect: "true"
    # Backend server SSL verification off (ArgoCD running insecure)
    haproxy.org/server-ssl: "false"
    # Connection timeout for long sync operations (5 minutes)
    haproxy.org/timeout-server: "300s"
    haproxy.org/timeout-client: "300s"
    # Enable HTTP/2 for gRPC support
    haproxy.org/server-proto: "h2"
    # Health check path
    haproxy.org/check: "true"
    haproxy.org/check-http: "/healthz"
spec:
  ingressClassName: haproxy
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
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
```

## gRPC Configuration

HAProxy supports gRPC natively through HTTP/2. The `server-proto: "h2"` annotation in the basic config enables this. For the ArgoCD CLI to connect, you need to make sure the backend is configured for HTTP/2:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-grpc
  namespace: argocd
  annotations:
    haproxy.org/server-proto: "h2"
    haproxy.org/timeout-server: "300s"
    haproxy.org/timeout-client: "300s"
    haproxy.org/timeout-tunnel: "3600s"
spec:
  ingressClassName: haproxy
  rules:
    - host: grpc.argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
  tls:
    - hosts:
        - grpc.argocd.example.com
      secretName: argocd-grpc-tls
```

The `timeout-tunnel` annotation is important for gRPC streaming connections, which ArgoCD uses for watching application events.

## TLS Passthrough Configuration

If you prefer to let ArgoCD handle TLS itself:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Enable SSL passthrough
    haproxy.org/ssl-passthrough: "true"
spec:
  ingressClassName: haproxy
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
  tls:
    - hosts:
        - argocd.example.com
```

For SSL passthrough, HAProxy passes encrypted traffic directly to ArgoCD. This means HAProxy cannot inspect or modify the traffic, so annotations like rate limiting and path-based routing will not work.

## Rate Limiting

Protect your ArgoCD API from abuse:

```yaml
annotations:
  # Rate limit: 50 requests per second per IP
  haproxy.org/rate-limit-requests: "50"
  # Rate limit period
  haproxy.org/rate-limit-period: "1s"
  # Return 429 when rate limit is exceeded
  haproxy.org/rate-limit-status-code: "429"
```

## IP Whitelisting

Restrict access to specific networks:

```yaml
annotations:
  # Only allow traffic from these CIDRs
  haproxy.org/whitelist: "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16"
```

## Connection Tuning

HAProxy gives you fine-grained control over connections. These settings are useful for ArgoCD because it handles both quick API calls and long-running sync operations:

```yaml
annotations:
  # Maximum concurrent connections per backend server
  haproxy.org/pod-maxconn: "100"
  # Connection queue timeout
  haproxy.org/timeout-queue: "30s"
  # HTTP keep-alive timeout
  haproxy.org/timeout-http-keep-alive: "60s"
  # Check interval for health checks
  haproxy.org/check-interval: "10s"
```

## Backend Health Checks

Configure detailed health checks for ArgoCD:

```yaml
annotations:
  haproxy.org/check: "true"
  haproxy.org/check-http: "/healthz"
  haproxy.org/check-interval: "10s"
  # Mark backend as down after 3 failed checks
  haproxy.org/check-fall: "3"
  # Mark backend as up after 2 successful checks
  haproxy.org/check-rise: "2"
```

## Custom HAProxy Configuration

For advanced use cases, you can inject raw HAProxy configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-configmap
  namespace: haproxy-controller
data:
  # Global section additions
  global-config-snippet: |
    # Increase maximum connections
    maxconn 4096
  # Backend section for ArgoCD
  backend-config-snippet: |
    # Enable server-side HTTP/2
    option httpchk GET /healthz
    http-check expect status 200
```

## Verifying the Setup

```bash
# Check the Ingress resource
kubectl get ingress -n argocd

# View HAProxy Ingress Controller logs
kubectl logs -n haproxy-controller -l app.kubernetes.io/name=kubernetes-ingress

# Check HAProxy stats (if enabled)
kubectl port-forward -n haproxy-controller svc/haproxy-ingress-kubernetes-ingress 1024:1024
# Visit http://localhost:1024/stats

# Test the UI
curl -I https://argocd.example.com

# Test CLI login
argocd login argocd.example.com --grpc-web
```

## Troubleshooting

**503 Errors**: Usually means the backend health check is failing. Verify `server.insecure` is set and the health check path is correct.

**Timeout During Sync**: Increase `timeout-server` and `timeout-tunnel` values. ArgoCD sync operations can take several minutes for large applications.

**gRPC Not Working**: Make sure `server-proto: "h2"` is set. Without HTTP/2, gRPC connections will fail.

**Connection Refused**: Check that the HAProxy Ingress Controller has an external IP assigned:

```bash
kubectl get svc -n haproxy-controller
```

For alternative ingress options, check our guides on [Nginx Ingress for ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-nginx-ingress/view) and [Traefik Ingress for ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-traefik-ingress/view).
