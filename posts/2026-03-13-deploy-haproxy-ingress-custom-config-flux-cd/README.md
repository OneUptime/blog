# Deploy HAProxy Ingress with Custom Configuration Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: HAProxy, Ingress, Load Balancing, Flux CD, GitOps, Kubernetes, Networking

Description: Deploy the HAProxy Ingress Controller on Kubernetes with custom global and per-Ingress configurations using Flux CD. This guide covers timeouts, rate limiting, TLS settings, and GitOps-managed configuration maps.

---

## Introduction

HAProxy Ingress is a high-performance Kubernetes Ingress controller backed by HAProxy, one of the most reliable load balancers available. It provides advanced traffic management features such as ACL-based routing, rate limiting, dynamic configuration reloads, and fine-grained TLS control that go beyond what many other ingress controllers offer.

Deploying HAProxy Ingress via Flux CD gives you version-controlled ingress configuration. Global defaults, custom ConfigMaps, and per-Ingress annotations are all managed as Git resources, making changes auditable and rollback simple.

This guide covers deploying the HAProxy Ingress controller and demonstrating custom configuration for timeouts, TLS hardening, and rate limiting.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- A LoadBalancer service type supported (cloud provider or MetalLB)
- `flux` and `kubectl` CLIs installed
- TLS certificates managed by cert-manager (optional but recommended)

## Step 1: Add the HAProxy Ingress HelmRepository

```yaml
# clusters/my-cluster/haproxy-ingress/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: haproxy-ingress
  namespace: flux-system
spec:
  interval: 12h
  url: https://haproxy-ingress.github.io/charts
```

## Step 2: Create the Custom ConfigMap

Define global HAProxy defaults in a ConfigMap. These settings apply to all Ingress resources unless overridden by annotations.

```yaml
# clusters/my-cluster/haproxy-ingress/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress
  namespace: ingress-haproxy
data:
  # Global connection and request timeouts
  timeout-connect: "5s"
  timeout-client: "50s"
  timeout-server: "50s"
  timeout-tunnel: "1h"

  # TLS hardening: disable old protocols and weak ciphers
  ssl-options: "no-sslv3 no-tlsv10 no-tlsv11"
  ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384"

  # Enable HSTS header on all HTTPS responses
  hsts: "true"
  hsts-max-age: "15768000"

  # Limit connections per IP to mitigate DDoS
  limit-connections: "25"
  limit-rps: "50"
  limit-whitelist: "10.0.0.0/8 172.16.0.0/12 192.168.0.0/16"
```

## Step 3: Deploy HAProxy Ingress via HelmRelease

```yaml
# clusters/my-cluster/haproxy-ingress/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: haproxy-ingress
  namespace: ingress-haproxy
spec:
  interval: 15m
  chart:
    spec:
      chart: haproxy-ingress
      version: ">=0.14.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: haproxy-ingress
        namespace: flux-system
  values:
    # Point the controller at the custom ConfigMap
    controller:
      config:
        configMapNamespace: ingress-haproxy
        configMapName: haproxy-ingress
      # Expose via LoadBalancer
      service:
        type: LoadBalancer
      # Enable Prometheus metrics
      stats:
        enabled: true
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true
      # Set the default IngressClass
      ingressClass: haproxy
      extraArgs:
        - --watch-namespace=""
```

## Step 4: Create a Sample Ingress with Per-Resource Annotations

Show how to apply HAProxy-specific annotations to individual Ingress resources.

```yaml
# clusters/my-cluster/apps/my-app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: default
  annotations:
    kubernetes.io/ingress.class: haproxy
    # Override global timeout for this specific backend
    haproxy-ingress.github.io/timeout-server: "120s"
    # Enable sticky sessions using a cookie
    haproxy-ingress.github.io/load-balance: "leastconn"
    haproxy-ingress.github.io/affinity: "cookie"
    haproxy-ingress.github.io/session-cookie-name: "SERVERID"
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 8080
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/haproxy-ingress/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: haproxy-ingress
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/haproxy-ingress
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: haproxy-ingress-controller
      namespace: ingress-haproxy
```

## Best Practices

- Always set `ssl-options` to disable TLS 1.0 and 1.1 in production.
- Use `limit-connections` and `limit-rps` in the ConfigMap as baseline protection; fine-tune per-service with annotations.
- Enable `stats` and `metrics` with a ServiceMonitor so HAProxy's backend health is visible in Grafana.
- Pin the chart version range to avoid unexpected upgrades that might change ConfigMap key names.
- Test ConfigMap changes in a staging namespace before promoting to production.

## Conclusion

HAProxy Ingress delivers enterprise-grade load balancing capabilities in Kubernetes. By managing the controller and its configuration via Flux CD, you get a fully GitOps-driven ingress layer where every timeout, TLS setting, and rate limit is tracked, reviewed, and automatically applied.
