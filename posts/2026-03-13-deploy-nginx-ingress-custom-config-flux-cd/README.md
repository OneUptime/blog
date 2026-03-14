# How to Deploy NGINX Ingress with Custom Configuration via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NGINX, Ingress Controller, HelmRelease, Custom Configuration, ConfigMap

Description: Deploy NGINX Ingress Controller with custom ConfigMap settings and annotation-based configuration using Flux CD HelmRelease for production-ready HTTP routing.

---

## Introduction

The NGINX Ingress Controller is the most widely deployed Kubernetes ingress solution, used in clusters of all sizes across every cloud provider. Its stability, extensive documentation, and broad community support make it the default choice for many teams. While it lacks some of the advanced routing features of specialized API gateways, its rich annotation system and global ConfigMap provide substantial customization for production workloads.

Deploying NGINX Ingress Controller through Flux CD ensures your ingress configuration is reproducible, version controlled, and consistently applied across environments. Tuning parameters like proxy timeouts, buffer sizes, and SSL settings are committed to Git rather than applied ad-hoc with kubectl, making your ingress configuration as auditable as your applications.

This guide deploys NGINX Ingress Controller using Flux CD HelmRelease with production-tuned ConfigMap settings covering performance, security, and TLS configuration.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- A load balancer provisioner (cloud provider or MetalLB for bare metal)
- TLS certificates (cert-manager or manual)

## Step 1: Add the NGINX Ingress HelmRepository

Register the official Kubernetes NGINX Ingress Helm repository.

```yaml
# infrastructure/nginx-ingress/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes.github.io/ingress-nginx
```

## Step 2: Deploy NGINX Ingress with Production Configuration

Configure the HelmRelease with production-tuned settings.

```yaml
# infrastructure/nginx-ingress/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: ">=4.10.0 <5.0.0"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
      interval: 12h
  values:
    controller:
      # Production performance settings via ConfigMap
      config:
        # Upstream connection timeouts
        proxy-connect-timeout: "10"
        proxy-read-timeout: "60"
        proxy-send-timeout: "60"

        # Body size limit (adjust per use case)
        proxy-body-size: "50m"

        # Buffer sizes for large headers/responses
        proxy-buffer-size: "16k"
        proxy-buffers-number: "8"
        large-client-header-buffers: "4 32k"

        # Keep-alive settings
        keep-alive: "75"
        keep-alive-requests: "1000"

        # Compression
        use-gzip: "true"
        gzip-types: "text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml"
        gzip-min-length: "1024"

        # Security settings
        ssl-protocols: "TLSv1.2 TLSv1.3"
        ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
        ssl-prefer-server-ciphers: "false"

        # HSTS
        hsts: "true"
        hsts-max-age: "31536000"
        hsts-include-subdomains: "true"
        hsts-preload: "true"

        # Log format for structured logging
        log-format-upstream: '{"time": "$time_iso8601", "remote_addr": "$proxy_protocol_addr", "x_forwarded_for": "$proxy_add_x_forwarded_for", "request_id": "$req_id", "remote_user": "$remote_user", "bytes_sent": $bytes_sent, "request_time": $request_time, "status": $status, "vhost": "$host", "request_proto": "$server_protocol", "path": "$uri", "request_query": "$args", "request_length": $request_length, "duration": $request_time, "method": "$request_method", "http_referrer": "$http_referer", "http_user_agent": "$http_user_agent"}'

        # Disable NGINX version in Server header
        server-tokens: "false"

        # Real IP handling
        use-forwarded-headers: "true"
        compute-full-forwarded-for: "true"
        forwarded-for-header: "X-Forwarded-For"

      # Resource allocation
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: "2"
          memory: 2Gi

      # High availability
      replicaCount: 2
      minAvailable: 1

      # Metrics for Prometheus
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true
          namespace: monitoring

      # Pod anti-affinity for availability
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/name: ingress-nginx
                topologyKey: kubernetes.io/hostname

    # Default backend for unmatched requests
    defaultBackend:
      enabled: true
      replicaCount: 1
      resources:
        requests:
          cpu: 10m
          memory: 20Mi
        limits:
          cpu: 100m
          memory: 64Mi
```

## Step 3: Configure the Flux Kustomization

Apply NGINX Ingress with proper dependency management.

```yaml
# clusters/production/nginx-ingress-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/nginx-ingress
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ingress-nginx-controller
      namespace: ingress-nginx
  timeout: 10m
```

## Step 4: Create TLS Ingress Resources

With NGINX Ingress running, create Ingress resources for your services.

```yaml
# apps/backend/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server
  namespace: backend
  annotations:
    # Use the NGINX ingress class
    kubernetes.io/ingress.class: nginx

    # Per-route overrides of global config
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"

    # Enable CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization"

    # cert-manager TLS
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-example-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
```

## Step 5: Verify NGINX Ingress Deployment

Validate the NGINX Ingress Controller is operating correctly.

```bash
# Check controller pods
kubectl get pods -n ingress-nginx

# Verify LoadBalancer IP is assigned
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Check Flux reconciliation
flux get helmrelease ingress-nginx -n ingress-nginx

# View applied ConfigMap settings
kubectl get configmap -n ingress-nginx ingress-nginx-controller -o yaml

# Test HTTPS routing
curl -I https://api.example.com/health

# Check NGINX logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | tail -50

# Verify metrics are being scraped
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller-metrics 10254:10254 &
curl http://localhost:10254/metrics | grep nginx_ingress
```

## Step 6: Monitor NGINX Performance

Import the official NGINX Ingress Grafana dashboard for visibility.

```yaml
# infrastructure/monitoring/nginx-dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-dashboard
  namespace: monitoring
  labels:
    # Grafana sidecar picks up dashboards with this label
    grafana_dashboard: "1"
data:
  nginx-ingress.json: |
    {
      "title": "NGINX Ingress Controller",
      "uid": "nginx-ingress-controller",
      "panels": []
    }
```

## Best Practices

- Use the `ingress-nginx` class annotation (`ingressClassName: nginx`) rather than the deprecated `kubernetes.io/ingress.class` annotation in new Ingress resources.
- Set conservative default timeouts in the ConfigMap and override them per-route using annotations for services that legitimately need longer timeouts.
- Enable the Prometheus ServiceMonitor and import the official NGINX Ingress Grafana dashboard (ID: 9614) for immediate visibility into request rates and latency.
- Use `nginx.ingress.kubernetes.io/configuration-snippet` annotations for custom NGINX location blocks, but audit them carefully — custom snippets can introduce security vulnerabilities.
- Regularly review and remove annotations from Ingress resources that duplicate the global ConfigMap settings; redundant annotations make configuration harder to maintain.
- Set `nginx.ingress.kubernetes.io/limit-rps` annotations on public-facing endpoints to protect against traffic spikes.

## Conclusion

NGINX Ingress Controller deployed and configured through Flux CD provides a stable, high-performance HTTP routing layer with full configuration traceability. Production tuning parameters are committed to Git, ensuring every cluster in your organization runs with the same optimized settings. The annotation system provides per-route flexibility without sacrificing the consistency of your global configuration baseline.
