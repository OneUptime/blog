# How to Deploy Kong Gateway DB-less Mode via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kong Gateway, API Gateway, DB-less, Declarative Configuration, HelmRelease

Description: Deploy Kong API Gateway in DB-less declarative configuration mode using Flux CD, managing all routing and plugin configuration as Git-tracked YAML without a database dependency.

---

## Introduction

Kong Gateway's DB-less mode is the ideal deployment model for GitOps workflows. Instead of storing configuration in PostgreSQL, Kong reads its routing rules, services, plugins, and consumers from a declarative YAML configuration file that you commit to Git. This eliminates the database as a runtime dependency, reduces operational complexity, and ensures that your API gateway configuration is fully version controlled - meaning every route change is a Git commit with an author, message, and diff.

The trade-off is that DB-less mode does not support features that require a database for coordination, such as the Kong Manager UI and some clustering features. For teams using GitOps, this trade-off is almost always worth it: you gain a simpler, more resilient gateway that is perfectly aligned with your Flux CD workflow.

This guide deploys Kong in DB-less mode using Flux CD HelmRelease, with the declarative configuration stored in a Kubernetes ConfigMap that Flux manages from your Git repository.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- A Flux `HelmRepository` for the Kong chart repository
- Basic understanding of Kong routing concepts (services, routes, plugins)
- The Kong Ingress Controller for Kubernetes-native configuration (optional alternative)

## Step 1: Create the Kong Declarative Configuration

Define your API gateway configuration in Kong's declarative format (deck format).

```yaml
# infrastructure/kong/kong-config.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-declarative-config
  namespace: kong
  labels:
    app.kubernetes.io/managed-by: flux
data:
  kong.yml: |
    _format_version: "3.0"
    _transform: true

    services:
      # Backend API service
      - name: api-service
        url: http://api-server.backend.svc.cluster.local:8080
        routes:
          - name: api-route
            paths:
              - /api/v1
            strip_path: false
            methods:
              - GET
              - POST
              - PUT
              - DELETE
            plugins:
              - name: rate-limiting
                config:
                  minute: 1000
                  policy: local

      # Public documentation service
      - name: docs-service
        url: http://docs.backend.svc.cluster.local:3000
        routes:
          - name: docs-route
            paths:
              - /docs
            methods:
              - GET

    plugins:
      # Global authentication plugin
      - name: key-auth
        enabled: false  # Enable when ready for auth

      # Global CORS plugin
      - name: cors
        config:
          origins:
            - "https://app.example.com"
          methods:
            - GET
            - POST
            - PUT
            - DELETE
          headers:
            - Authorization
            - Content-Type

      # Correlation ID for tracing
      - name: correlation-id
        config:
          header_name: X-Request-ID
          generator: uuid
```

## Step 2: Deploy Kong in DB-less Mode

Configure the HelmRelease to run Kong in DB-less mode, using the ConfigMap as the configuration source.

```yaml
# infrastructure/kong/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kong
  namespace: kong
spec:
  interval: 30m
  chart:
    spec:
      chart: kong
      version: ">=2.30.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: kong
        namespace: flux-system
      interval: 12h
  values:
    # DB-less mode - no database required
    env:
      database: "off"

    # Load the ConfigMap containing the declarative config.
    # The ConfigMap must contain a key named kong.yml.
    dblessConfig:
      configMap: kong-declarative-config

    # Disable Admin API writes (not supported in DB-less mode)
    admin:
      enabled: true
      http:
        enabled: true
        servicePort: 8001
      # Admin API in DB-less mode is read-only

    proxy:
      enabled: true
      http:
        enabled: true
        servicePort: 80
      tls:
        enabled: true
        servicePort: 443

    # DB-less mode is stateless - scale horizontally
    replicaCount: 3

    # Disable the Ingress Controller for file-based declarative config.
    # If you enable it, manage routes with Kubernetes resources instead.
    ingressController:
      enabled: false

    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: "1"
        memory: 1Gi

    # High availability configuration
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/name: kong
              topologyKey: kubernetes.io/hostname
```

## Step 3: Set Up the Flux Kustomization

Apply Kong configuration with proper dependency ordering.

```yaml
# clusters/production/kong-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kong
  namespace: flux-system
spec:
  interval: 5m  # Frequent reconciliation to pick up config changes
  path: ./infrastructure/kong
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kong-kong
      namespace: kong
  timeout: 5m
```

## Step 4: Reload Kong Configuration

When you update the ConfigMap in Git, Flux applies the change. Externally supplied ConfigMaps are not hashed or tracked in Kong's Deployment annotations, so roll the Deployment after Flux applies the update.

```bash
# Reload config after Flux applies ConfigMap changes
kubectl rollout restart deployment/kong-kong -n kong

# Monitor logs for the restarted pods
kubectl logs -n kong -l app=kong -f | grep "configuration"
```

## Step 5: Validate the Configuration

Test your Kong DB-less deployment to confirm routing is working.

```bash
# Check Kong pods are all running
kubectl get pods -n kong

# Check Flux reconciliation
flux get kustomization kong
flux get helmrelease kong -n kong

# Verify Kong loaded the declarative config
kubectl port-forward -n kong svc/kong-kong-admin 8001:8001 &
curl http://localhost:8001/services  # Should show your configured services
curl http://localhost:8001/routes    # Should show your configured routes

# Test a route through the proxy
kubectl port-forward -n kong svc/kong-kong-proxy 8080:80 &
curl http://localhost:8080/api/v1/health
```

## Step 6: Add Kubernetes Ingress Resources

If you prefer Kubernetes-native routing, enable the Kong Ingress Controller and manage routes with Kubernetes resources instead of the file-based declarative config shown above.

```yaml
# apps/backend/api-ingress.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-policy
  namespace: backend
config:
  minute: 1000
  policy: local
plugin: rate-limiting
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server-ingress
  namespace: backend
  annotations:
    # Kong-specific plugin annotation
    konghq.com/plugins: rate-limit-policy
spec:
  ingressClassName: kong
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

## Best Practices

- Store the Kong declarative configuration in a dedicated file within your Git repository; avoid embedding complex YAML inside a ConfigMap as a string - use Kustomize ConfigMapGenerator instead.
- If you use `configMapGenerator`, make sure the generated ConfigMap name is also reflected in the HelmRelease value, or disable the generated name suffix and roll the Deployment after ConfigMap changes.
- Validate your Kong declarative config locally with `deck file validate` before committing to Git to catch syntax errors before they reach production.
- Version your API configuration using Git tags; when a routing change causes issues, `git revert` immediately rolls back the Kong configuration.
- Monitor Kong metrics in Prometheus; DB-less mode exposes the same Prometheus endpoint as database mode.
- Use Kong's plugin ordering feature to explicitly define the execution order of multiple plugins on the same route.

## Conclusion

Kong Gateway in DB-less mode is the natural fit for GitOps workflows managed by Flux CD. Without a database dependency, Kong becomes a stateless, highly scalable API gateway where every configuration change is a Git commit. This model provides the configuration simplicity of a static reverse proxy with the power and extensibility of Kong's plugin ecosystem - all managed through the same GitOps workflows you use for your application deployments.
