# How to Deploy NGINX Ingress Controller with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, NGINX, Ingress Controller, Kubernetes, GitOps, Networking, Load Balancing

Description: Learn how to deploy and manage the NGINX Ingress Controller using Flux CD for GitOps-based ingress management in Kubernetes.

---

## Introduction

The NGINX Ingress Controller is one of the most widely used ingress controllers for Kubernetes. It provides HTTP and HTTPS routing, load balancing, SSL termination, and many other networking features. Deploying it with Flux CD ensures your ingress infrastructure is version-controlled, auditable, and automatically reconciled.

This guide covers deploying the NGINX Ingress Controller using Flux CD's HelmRelease, configuring it for production use, and setting up Ingress resources for your applications.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- kubectl configured for your cluster
- A domain name for configuring ingress rules
- Optionally, cert-manager for TLS certificate management

## Repository Structure

```text
clusters/
  production/
    infrastructure/
      sources/
        ingress-nginx.yaml      # HelmRepository source
      ingress-nginx/
        namespace.yaml          # Namespace definition
        release.yaml            # HelmRelease for NGINX
        kustomization.yaml      # Flux Kustomization
    apps/
      ingress-rules/
        webapp-ingress.yaml     # Application ingress rules
        api-ingress.yaml
```

## Adding the NGINX Ingress Helm Repository

```yaml
# clusters/production/infrastructure/sources/ingress-nginx.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  # Official NGINX Ingress Helm chart repository
  interval: 1h
  url: https://kubernetes.github.io/ingress-nginx
```

## Creating the Namespace

```yaml
# clusters/production/infrastructure/ingress-nginx/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
  labels:
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
```

## Deploying NGINX Ingress with HelmRelease

```yaml
# clusters/production/infrastructure/ingress-nginx/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 1h
  chart:
    spec:
      chart: ingress-nginx
      version: "4.11.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
      interval: 1h
  # Installation configuration
  install:
    createNamespace: true
    remediation:
      retries: 3
  # Upgrade configuration
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
  # Helm values for NGINX Ingress
  values:
    controller:
      # Replica count for high availability
      replicaCount: 3

      # Pod disruption budget
      minAvailable: 2

      # Resource allocation
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 512Mi

      # Service configuration
      service:
        type: LoadBalancer
        annotations:
          # AWS NLB annotations (adjust for your cloud provider)
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
          service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
          service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing

      # Ingress class configuration
      ingressClassResource:
        name: nginx
        enabled: true
        default: true
        controllerValue: "k8s.io/ingress-nginx"

      # Metrics for monitoring
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true
          namespace: monitoring

      # Admission webhooks for validation
      admissionWebhooks:
        enabled: true

      # Pod anti-affinity for spreading across nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app.kubernetes.io/name
                      operator: In
                      values:
                        - ingress-nginx
                topologyKey: kubernetes.io/hostname

      # Custom NGINX configuration
      config:
        # Enable gzip compression
        use-gzip: "true"
        gzip-types: "application/json application/javascript text/css text/plain"
        # Security headers
        hide-headers: "X-Powered-By,Server"
        # Connection settings
        keep-alive: "75"
        keep-alive-requests: "1000"
        # Logging format
        log-format-upstream: >-
          $remote_addr - $remote_user [$time_local]
          "$request" $status $body_bytes_sent
          "$http_referer" "$http_user_agent"
          $request_length $request_time
          [$proxy_upstream_name] $upstream_addr
          $upstream_response_length $upstream_response_time $upstream_status
        # Enable real IP from proxy protocol
        use-proxy-protocol: "false"
        # Rate limiting defaults
        limit-req-status-code: "429"

      # Topology spread constraints
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx

    # Default backend for unmatched routes
    defaultBackend:
      enabled: true
      replicaCount: 2
      image:
        registry: registry.k8s.io
        image: defaultbackend-amd64
        tag: "1.5"
      resources:
        requests:
          cpu: 10m
          memory: 20Mi
        limits:
          cpu: 50m
          memory: 64Mi
```

## Flux Kustomization for NGINX Ingress

```yaml
# clusters/production/infrastructure/ingress-nginx/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/infrastructure/ingress-nginx
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ingress-nginx-controller
      namespace: ingress-nginx
  # Deploy infrastructure before applications
  dependsOn: []
```

## Creating Ingress Resources for Applications

### Basic HTTP Ingress

```yaml
# clusters/production/apps/ingress-rules/webapp-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: production
  annotations:
    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "50"
    # CORS configuration
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://example.com"
spec:
  ingressClassName: nginx
  # TLS configuration
  tls:
    - hosts:
        - app.example.com
      secretName: webapp-tls
  rules:
    - host: app.example.com
      http:
        paths:
          # Frontend application
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
          # API backend
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8080
```

### Ingress with Advanced Routing

```yaml
# clusters/production/apps/ingress-rules/api-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    # Custom timeout settings
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    # Request body size limit
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    # Upstream hash-based load balancing
    nginx.ingress.kubernetes.io/upstream-hash-by: "$remote_addr"
    # Enable WebSocket support
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1
                port:
                  number: 8080
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2
                port:
                  number: 8080
```

## Integrating with cert-manager for TLS

Automate TLS certificate provisioning:

```yaml
# clusters/production/infrastructure/cert-manager/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-production
    solvers:
      - http01:
          ingress:
            class: nginx
```

```yaml
# Updated ingress with cert-manager annotation
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: production
  annotations:
    # cert-manager will provision and renew TLS certificates
    cert-manager.io/cluster-issuer: "letsencrypt-production"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      # cert-manager will create this secret automatically
      secretName: webapp-tls-auto
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

## Monitoring NGINX Ingress

### Prometheus ServiceMonitor

```yaml
# clusters/production/monitoring/nginx-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ingress-nginx
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
  namespaceSelector:
    matchNames:
      - ingress-nginx
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Flux Alert for NGINX Ingress

```yaml
# clusters/production/monitoring/nginx-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: ingress-nginx-alerts
  namespace: flux-system
spec:
  severity: warning
  providerRef:
    name: slack-notifications
  eventSources:
    - kind: HelmRelease
      name: ingress-nginx
      namespace: ingress-nginx
```

## Troubleshooting

### NGINX Controller Not Starting

```bash
# Check HelmRelease status
flux get helmreleases -n ingress-nginx

# View controller pod logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check events
kubectl get events -n ingress-nginx --sort-by='.lastTimestamp'
```

### Ingress Not Routing Traffic

```bash
# Verify ingress resource
kubectl describe ingress webapp-ingress -n production

# Check NGINX configuration
kubectl exec -n ingress-nginx deployment/ingress-nginx-controller -- \
  cat /etc/nginx/nginx.conf | grep -A 10 "app.example.com"

# Test connectivity to the backend service
kubectl exec -n ingress-nginx deployment/ingress-nginx-controller -- \
  curl -s http://frontend.production.svc:80/healthz
```

### TLS Certificate Issues

```bash
# Check certificate status
kubectl describe certificate webapp-tls-auto -n production

# View cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Force certificate renewal
kubectl delete certificate webapp-tls-auto -n production
```

## Best Practices

1. **Use HelmRelease for deployment** - Manage the NGINX Ingress Controller as a HelmRelease so Flux CD handles upgrades and rollbacks automatically.
2. **Enable high availability** - Run at least 3 replicas with pod anti-affinity and topology spread constraints for production.
3. **Set resource limits** - Always configure resource requests and limits to prevent the controller from consuming excessive cluster resources.
4. **Use cert-manager** - Automate TLS certificate provisioning and renewal with cert-manager and Let's Encrypt.
5. **Monitor metrics** - Enable Prometheus metrics and set up alerts for error rates, latency, and connection counts.

## Conclusion

Deploying NGINX Ingress Controller with Flux CD gives you a fully GitOps-managed ingress infrastructure. The HelmRelease ensures the controller is installed, configured, and upgraded through version-controlled values, while Ingress resources define routing rules that Flux CD reconciles automatically. Combined with cert-manager for TLS and Prometheus for monitoring, this setup provides a production-ready ingress solution that is auditable, repeatable, and self-healing.
