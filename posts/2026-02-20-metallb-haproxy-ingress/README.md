# How to Deploy MetalLB with HAProxy Ingress Controller

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, MetalLB, HAProxy, Ingresses, Load Balancing

Description: Learn how to deploy MetalLB with the HAProxy Ingress Controller for high-performance bare-metal load balancing.

---

HAProxy is one of the most battle-tested load balancers in the industry. The HAProxy Ingress Controller brings that reliability to Kubernetes. On bare-metal clusters, pairing HAProxy Ingress with MetalLB gives you a high-performance ingress stack that can handle millions of concurrent connections.

This guide shows you how to deploy and configure MetalLB with the HAProxy Ingress Controller.

## Why HAProxy Ingress

HAProxy Ingress stands out for several reasons:

- Extremely high performance with low memory usage
- Connection draining for zero-downtime deployments
- Native support for TCP and HTTP load balancing
- Active health checks for backend pods
- Dynamic configuration updates with graceful reloads and runtime socket updates when possible

```mermaid
flowchart TD
    A[Internet Traffic] --> B[MetalLB VIP]
    B --> C[HAProxy Ingress]
    C --> D{Protocol}
    D -->|HTTP/HTTPS| E[HTTP Frontend]
    D -->|TCP| F[TCP Frontend]
    E --> G[ACL Rules]
    G --> H[Backend Pool A]
    G --> I[Backend Pool B]
    F --> J[TCP Backend]
    H --> K[Pod 1]
    H --> L[Pod 2]
    I --> M[Pod 3]
```

## Prerequisites

- Kubernetes cluster running on bare metal
- MetalLB installed with an IP address pool configured
- Helm 3 installed
- kubectl access to the cluster

## Step 1: Configure MetalLB

If MetalLB is not yet configured, create an IP pool:

```yaml
# metallb-pool.yaml

# Reserve a range of IPs for the HAProxy Ingress Controller.
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: haproxy-pool
  namespace: metallb-system
spec:
  addresses:
    # Adjust to your network range
    - 192.168.1.200-192.168.1.220
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: haproxy-l2
  namespace: metallb-system
spec:
  ipAddressPools:
    - haproxy-pool
```

```bash
kubectl apply -f metallb-pool.yaml
```

## Step 2: Install HAProxy Ingress Controller

Install the HAProxy Ingress Controller using Helm:

```bash
# Add the HAProxy Ingress Helm repository
helm repo add haproxy-ingress https://haproxy-ingress.github.io/charts
helm repo update

# Install HAProxy Ingress Controller
helm install haproxy-ingress haproxy-ingress/haproxy-ingress \
  --namespace haproxy-ingress \
  --create-namespace \
  --set controller.ingressClassResource.enabled=true \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local \
  --set controller.stats.enabled=true \
  --set controller.metrics.enabled=true \
  --set controller.logs.enabled=true
```

## Step 3: Verify the Deployment

```bash
# Check that MetalLB assigned an IP
kubectl get svc -n haproxy-ingress

# Expected output shows an EXTERNAL-IP from the MetalLB pool
# NAME              TYPE           EXTERNAL-IP     PORT(S)
# haproxy-ingress   LoadBalancer   192.168.1.200   80:30080/TCP,443:30443/TCP

# Check HAProxy pods are running
kubectl get pods -n haproxy-ingress

# Test basic connectivity
curl -v http://192.168.1.200
```

## Step 4: Deploy a Sample Application

```yaml
# sample-app.yaml
# Deploy a web application behind HAProxy Ingress.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web
          image: hashicorp/http-echo
          args:
            - "-text=Hello from HAProxy + MetalLB"
          ports:
            - containerPort: 5678
          # Readiness probe for HAProxy health checks
          readinessProbe:
            httpGet:
              path: /
              port: 5678
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
spec:
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 5678
---
# Ingress resource with HAProxy-specific annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: default
  annotations:
    # HAProxy-specific: configure backend balance algorithm
    haproxy-ingress.github.io/balance-algorithm: "roundrobin"
    # Enable health checks on backends
    haproxy-ingress.github.io/health-check-interval: "5s"
spec:
  ingressClassName: haproxy
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

```bash
# Deploy the application
kubectl apply -f sample-app.yaml

# Test the route
curl -H "Host: web.example.com" http://192.168.1.200
```

## HAProxy-Specific Features

### Connection Draining

HAProxy Ingress supports graceful connection draining during deployments. When a pod is being terminated, HAProxy stops sending new connections but allows existing connections to complete:

```yaml
# haproxy-ingress-values.yaml
# Configure drain support globally with Helm values.
controller:
  config:
    drain-support: "true"
    drain-support-redispatch: "true"
```

### TCP Load Balancing

HAProxy Ingress can load balance raw TCP connections, useful for databases or other non-HTTP services:

```yaml
# tcp-service-ingress.yaml
# Configure TCP load balancing for a PostgreSQL service.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: postgresql-tcp
  namespace: database
  annotations:
    haproxy-ingress.github.io/tcp-service-port: "5432"
spec:
  ingressClassName: haproxy
  defaultBackend:
    service:
      name: postgresql
      port:
        number: 5432
```

Expose the TCP port on the HAProxy Ingress Service as well:

```bash
helm upgrade haproxy-ingress haproxy-ingress/haproxy-ingress \
  --namespace haproxy-ingress \
  --reuse-values \
  --set controller.service.extraPorts[0].port=5432 \
  --set controller.service.extraPorts[0].targetPort=5432
```

### Backend Weight for Canary Deployments

HAProxy supports weighted backend groups for canary deployments. The example below assumes the stable and canary pods are selected by the same Service and labeled with `track=stable` and `track=canary`:

```yaml
# canary-ingress.yaml
# Split traffic between stable and canary backends.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary-deploy
  namespace: default
  annotations:
    # Send 90% of traffic to stable, 10% to canary
    haproxy-ingress.github.io/balance-algorithm: "roundrobin"
    haproxy-ingress.github.io/blue-green-balance: "track=stable=90,track=canary=10"
spec:
  ingressClassName: haproxy
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 80
```

## Request Flow with Health Checks

```mermaid
sequenceDiagram
    participant Client
    participant MLB as MetalLB VIP
    participant HAP as HAProxy Ingress
    participant PodA as Pod A (Healthy)
    participant PodB as Pod B (Healthy)
    participant PodC as Pod C (Unhealthy)

    Note over HAP,PodC: Health check loop
    HAP->>PodA: Health check GET /
    PodA-->>HAP: 200 OK
    HAP->>PodB: Health check GET /
    PodB-->>HAP: 200 OK
    HAP->>PodC: Health check GET /
    PodC-->>HAP: Connection refused
    HAP->>HAP: Mark Pod C as down

    Note over Client,PodB: Request flow
    Client->>MLB: HTTP request
    MLB->>HAP: Forward to HAProxy
    HAP->>HAP: Select healthy backend (round robin)
    HAP->>PodA: Forward request (skips Pod C)
    PodA-->>Client: Response
```

## Monitoring HAProxy Metrics

HAProxy exposes a rich set of metrics. Enable the stats page and Prometheus endpoint:

```bash
# Access the HAProxy stats page
kubectl port-forward -n haproxy-ingress svc/haproxy-ingress-stats 1936:1936

# Access Prometheus metrics
kubectl port-forward -n haproxy-ingress svc/haproxy-ingress-metrics 9101:9101

# Open http://localhost:1936/stats for the HAProxy stats dashboard
# Open http://localhost:9101/metrics for Prometheus metrics
```

Key metrics for monitoring:

- `haproxy_frontend_current_sessions` - Active connections
- `haproxy_backend_response_time_average_seconds` - Backend latency
- `haproxy_backend_up` - Backend health status
- `haproxy_server_status` - Individual server status
- `haproxy_frontend_bytes_in_total` - Ingress bandwidth

```yaml
# servicemonitor-haproxy.yaml
# Scrape HAProxy metrics with Prometheus.
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: haproxy-ingress
  namespace: haproxy-ingress
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: haproxy-ingress
      app.kubernetes.io/instance: haproxy-ingress
  endpoints:
    - port: metrics
      interval: 15s
    - port: ctrl-metrics
      interval: 15s
```

## Troubleshooting

Common issues:

1. **503 Service Unavailable** - Backend pods are failing health checks. Check pod readiness probes
2. **Connection timeouts** - MetalLB VIP may not be reachable. Verify L2 advertisement is configured
3. **Uneven load distribution** - Check the balance algorithm. `leastconn` may work better than `roundrobin` for long-lived connections
4. **High latency** - Check HAProxy stats for backend response times and connection queuing

```bash
# Debug commands
kubectl logs -n haproxy-ingress -l app.kubernetes.io/name=haproxy-ingress
kubectl get events -n haproxy-ingress
kubectl describe ingress web-app-ingress
```

## Summary

MetalLB paired with the HAProxy Ingress Controller gives you a high-performance, production-grade ingress solution for bare-metal Kubernetes. HAProxy's connection draining, active health checks, and TCP load balancing capabilities make it an excellent choice for demanding workloads.

To monitor the health and performance of services behind your HAProxy and MetalLB stack, use [OneUptime](https://oneuptime.com). OneUptime provides endpoint monitoring, alerting, incident management, and status pages in one platform, so you can detect and respond to issues before your users notice them.
