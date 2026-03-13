# How to Configure HAProxy Ingress for Kubernetes on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Kubernetes, HAProxy, Ingresses, Load Balancing, Linux

Description: Learn how to install and configure the HAProxy Ingress Controller for Kubernetes on RHEL, covering deployment, TLS termination, rate limiting, and production-ready tuning.

---

If you run Kubernetes on RHEL and need a battle-tested ingress controller, HAProxy Ingress is a solid choice. It combines the performance of HAProxy with native Kubernetes integration, giving you fine-grained control over routing, TLS, rate limiting, and backend health checks. This guide covers everything from installation through production tuning.

## Why HAProxy Ingress

HAProxy has been the go-to TCP/HTTP load balancer in production environments for years. The HAProxy Ingress Controller brings that reliability into Kubernetes, offering:

- High throughput with low latency
- Dynamic configuration reloading without dropping connections
- Rich annotation-based routing
- Native support for TCP and HTTP load balancing
- Active health checking of backend pods

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster on RHEL (version 1.25 or newer)
- kubectl configured to communicate with your cluster
- Helm 3 installed on your workstation
- Cluster admin privileges

Verify your cluster is healthy:

```bash
# Check cluster nodes are ready
kubectl get nodes
```

```bash
# Verify Helm is available
helm version
```

## Installing HAProxy Ingress with Helm

Add the HAProxy Ingress Helm repository:

```bash
# Add the HAProxy Ingress chart repository
helm repo add haproxy-ingress https://haproxy-ingress.github.io/charts
helm repo update
```

Create a dedicated namespace:

```bash
# Create a namespace for the ingress controller
kubectl create namespace haproxy-ingress
```

Install the controller with a base configuration:

```bash
# Install HAProxy Ingress with default settings
helm install haproxy-ingress haproxy-ingress/haproxy-ingress \
  --namespace haproxy-ingress \
  --set controller.replicaCount=2 \
  --set controller.service.type=LoadBalancer
```

Wait for the pods to become ready:

```bash
# Watch the deployment roll out
kubectl -n haproxy-ingress rollout status deployment/haproxy-ingress
```

Check that the service got an external IP or is pending (depending on whether you have a load balancer provider):

```bash
# Get the service details
kubectl -n haproxy-ingress get svc haproxy-ingress
```

## Deploying a Sample Application

Create a simple test deployment and service:

```bash
# Deploy a simple web application
kubectl create deployment web --image=nginx:alpine --replicas=2
kubectl expose deployment web --port=80 --target-port=80
```

## Creating an Ingress Resource

Define an Ingress resource that routes traffic through HAProxy:

```yaml
# web-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    kubernetes.io/ingress.class: haproxy
spec:
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

Apply the resource:

```bash
# Create the ingress resource
kubectl apply -f web-ingress.yaml
```

Verify the ingress is active:

```bash
# Check the ingress status
kubectl get ingress web-ingress
```

## Configuring TLS Termination

Generate a TLS certificate (or use an existing one) and create a Kubernetes secret:

```bash
# Create a self-signed certificate for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=web.example.com"
```

```bash
# Create a TLS secret from the certificate
kubectl create secret tls web-tls --cert=tls.crt --key=tls.key
```

Update the ingress to use TLS:

```yaml
# web-ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    kubernetes.io/ingress.class: haproxy
    haproxy-ingress.github.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - web.example.com
    secretName: web-tls
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

```bash
# Apply the updated ingress with TLS
kubectl apply -f web-ingress-tls.yaml
```

## Configuring Rate Limiting

HAProxy Ingress supports rate limiting through annotations:

```yaml
# rate-limited-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    kubernetes.io/ingress.class: haproxy
    haproxy-ingress.github.io/limit-rps: "10"
    haproxy-ingress.github.io/limit-connections: "5"
spec:
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

This limits each source IP to 10 requests per second and 5 concurrent connections.

## Backend Health Checks

Configure active health checking for your backends:

```yaml
metadata:
  annotations:
    haproxy-ingress.github.io/health-check-interval: "5s"
    haproxy-ingress.github.io/health-check-rise: "2"
    haproxy-ingress.github.io/health-check-fall: "3"
```

These annotations tell HAProxy to check backends every 5 seconds, mark them as healthy after 2 successful checks, and mark them as down after 3 consecutive failures.

## Tuning for Production

For production workloads, adjust the controller settings via a ConfigMap or Helm values:

```yaml
# haproxy-values.yaml
controller:
  replicaCount: 3
  config:
    max-connections: "10000"
    timeout-connect: "5s"
    timeout-server: "60s"
    timeout-client: "60s"
    nbthread: "4"
  resources:
    requests:
      cpu: 500m
      memory: 256Mi
    limits:
      cpu: "2"
      memory: 512Mi
```

```bash
# Upgrade the release with production values
helm upgrade haproxy-ingress haproxy-ingress/haproxy-ingress \
  --namespace haproxy-ingress \
  -f haproxy-values.yaml
```

## Monitoring HAProxy Ingress

Enable the built-in stats endpoint:

```yaml
controller:
  config:
    stats-proxy-protocol: "false"
  stats:
    enabled: true
    port: 1936
```

You can also expose Prometheus metrics:

```yaml
controller:
  metrics:
    enabled: true
    service:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "10254"
```

## Troubleshooting Common Issues

Check controller logs if routes are not working:

```bash
# View HAProxy Ingress controller logs
kubectl -n haproxy-ingress logs -l app.kubernetes.io/name=haproxy-ingress --tail=50
```

Verify the generated HAProxy configuration:

```bash
# Exec into the controller pod and check the config
kubectl -n haproxy-ingress exec -it deploy/haproxy-ingress -- cat /etc/haproxy/haproxy.cfg | head -100
```

Common issues include:

- Ingress class mismatch: make sure the annotation matches what the controller expects
- Missing TLS secret: the secret must be in the same namespace as the ingress
- Backend pods not ready: check that your pods pass readiness probes

## Conclusion

HAProxy Ingress gives you a high-performance, production-grade ingress controller on RHEL Kubernetes clusters. With annotation-based configuration, TLS termination, rate limiting, and active health checking, it covers the needs of most production workloads without adding unnecessary complexity.
