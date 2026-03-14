# How to Deploy API Gateway with Backend Services in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, API Gateway, Microservices, HelmRelease, Backend Services

Description: Learn how to deploy an API gateway alongside backend microservices using Flux CD with proper dependency ordering and configuration.

---

## Introduction

An API gateway is the entry point for external traffic into your microservice architecture. It handles routing, authentication, rate limiting, and load balancing across backend services. Deploying it correctly requires that backend services are already healthy and reachable before the gateway begins routing traffic, otherwise your users encounter errors during the deployment window.

Flux CD makes it straightforward to model this relationship. By using `dependsOn` in your API gateway's HelmRelease or Kustomization, you ensure the gateway is only reconciled after all backend services are confirmed healthy. Combined with Kubernetes readiness probes and Flux health checks, this gives you a reliable, ordered deployment of your entire API tier.

In this guide you will deploy Kong as an API gateway alongside two backend microservices (orders service and users service) using Flux CD HelmReleases with proper dependency ordering and configuration synchronization.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- Helm repositories for your gateway (e.g., Kong, Traefik, Nginx) and backend charts
- Basic understanding of API gateway concepts

## Step 1: Add HelmRepository Sources

```yaml
# clusters/production/sources/kong.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kong
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.konghq.com
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.myorg.com
  secretRef:
    name: chart-repo-credentials
```

## Step 2: Deploy Backend Services

Deploy each backend service as an independent HelmRelease.

```yaml
# clusters/production/apps/users-service-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: users-service
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: backend
  createNamespace: true
  chart:
    spec:
      chart: users-service
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
  values:
    replicaCount: 3
    image:
      repository: myregistry/users-service
      tag: "v2.4.1"
    service:
      type: ClusterIP
      port: 8080
    readinessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

```yaml
# clusters/production/apps/orders-service-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: orders-service
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: backend
  createNamespace: true
  chart:
    spec:
      chart: orders-service
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
  values:
    replicaCount: 3
    image:
      repository: myregistry/orders-service
      tag: "v1.8.0"
    service:
      type: ClusterIP
      port: 8081
    readinessProbe:
      httpGet:
        path: /ready
        port: 8081
      initialDelaySeconds: 15
      periodSeconds: 5
```

## Step 3: Deploy the API Gateway

Deploy Kong as the API gateway with `dependsOn` ensuring backend services are ready first.

```yaml
# clusters/production/apps/api-gateway-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: api-gateway
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: gateway
  createNamespace: true
  chart:
    spec:
      chart: kong
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: kong
  # Gateway must wait for all backend services
  dependsOn:
    - name: users-service
      namespace: flux-system
    - name: orders-service
      namespace: flux-system
  values:
    # Use DB-less mode for GitOps-friendly configuration
    env:
      database: "off"
      declarative_config: /opt/kong/kong.yaml

    # Mount the Kong declarative config from a ConfigMap
    volumes:
      - name: kong-config
        configMap:
          name: kong-declarative-config

    volumeMounts:
      - name: kong-config
        mountPath: /opt/kong

    # Expose Kong via LoadBalancer
    proxy:
      type: LoadBalancer
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-type: nlb

    # Disable Kong admin API exposure externally
    admin:
      enabled: true
      type: ClusterIP
```

## Step 4: Create Kong Declarative Configuration

Store Kong routing rules as a ConfigMap in Git.

```yaml
# clusters/production/apps/kong-config-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-declarative-config
  namespace: gateway
data:
  kong.yaml: |
    _format_version: "3.0"
    _transform: true

    services:
      # Route /api/users/* to users-service
      - name: users-service
        url: http://users-service.backend.svc.cluster.local:8080
        routes:
          - name: users-routes
            paths:
              - /api/users
            strip_path: false
            methods:
              - GET
              - POST
              - PUT
              - DELETE

      # Route /api/orders/* to orders-service
      - name: orders-service
        url: http://orders-service.backend.svc.cluster.local:8081
        routes:
          - name: orders-routes
            paths:
              - /api/orders
            strip_path: false

    # Rate limiting plugin applied globally
    plugins:
      - name: rate-limiting
        config:
          minute: 1000
          hour: 50000
          policy: local
```

## Step 5: Apply and Verify the Full Stack

```bash
# Apply sources and all HelmReleases
kubectl apply -f clusters/production/sources/
kubectl apply -f clusters/production/apps/

# Observe the deployment order
flux get helmreleases --watch

# Verify backend services are healthy before gateway
kubectl get pods -n backend
kubectl get pods -n gateway

# Check the gateway's external IP
kubectl get svc -n gateway kong-proxy

# Test routing through the gateway
GATEWAY_IP=$(kubectl get svc kong-proxy -n gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$GATEWAY_IP/api/users/health
curl http://$GATEWAY_IP/api/orders/health
```

## Step 6: Update Gateway Configuration

When you update the Kong config ConfigMap in Git, Flux reconciles the change.

```bash
# After pushing the updated kong-config-configmap.yaml to Git
flux reconcile kustomization all-apps --with-source

# Or force the gateway to pick up the new ConfigMap
kubectl rollout restart deployment/kong -n gateway

# Verify new routes are active
curl http://$GATEWAY_IP/api/new-route/health
```

## Best Practices

- Use DB-less Kong mode for GitOps compatibility — all routing rules live in Git
- Always set `dependsOn` on the gateway pointing to all backend services
- Configure `readinessProbe` on backend services so Flux health checks accurately reflect readiness
- Keep Kong configuration in a versioned ConfigMap or use the Kong Ingress Controller with Ingress resources
- Use separate namespaces for the gateway and backend services for RBAC isolation
- Enable Kong's Prometheus plugin for gateway-level metrics

## Conclusion

Deploying an API gateway with Flux CD requires careful attention to ordering and configuration management. By using `dependsOn` to ensure backend services are healthy before the gateway starts routing, and by storing gateway configuration declaratively in Git, you achieve a fully automated, reproducible deployment pipeline. When backend services change, the gateway configuration can be updated in the same Git commit, keeping routing rules in sync with service changes.
