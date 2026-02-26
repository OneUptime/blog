# How to Manage Istio Destination Rules with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Istio, Service Mesh

Description: Learn how to manage Istio DestinationRule resources with ArgoCD for GitOps-driven load balancing, connection pools, TLS settings, and service subset management.

---

Istio DestinationRules define policies that apply to traffic intended for a service after routing has occurred. They control load balancing algorithms, connection pool settings, outlier detection, and TLS configuration. These are the companion resources to VirtualServices - while VirtualServices decide where traffic goes, DestinationRules decide how it gets there.

Managing DestinationRules through ArgoCD ensures that critical traffic policies like circuit breakers, mutual TLS, and load balancing are version controlled and consistently applied.

## DestinationRule Fundamentals

A DestinationRule configures what happens to traffic after it has been routed to a destination:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
spec:
  host: product-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    loadBalancer:
      simple: LEAST_REQUEST
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Setting Up ArgoCD for DestinationRules

### Repository Structure

Keep DestinationRules alongside their VirtualServices:

```
istio-config/
  base/
    kustomization.yaml
    destination-rules/
      product-service.yaml
      order-service.yaml
      user-service.yaml
      payment-service.yaml
    virtual-services/
      product-service.yaml
      order-service.yaml
  overlays/
    staging/
      kustomization.yaml
      destination-rules/
        product-service-patch.yaml
    production/
      kustomization.yaml
      destination-rules/
        product-service-patch.yaml
```

### Kustomization File

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - destination-rules/product-service.yaml
  - destination-rules/order-service.yaml
  - destination-rules/user-service.yaml
  - destination-rules/payment-service.yaml
  - virtual-services/product-service.yaml
  - virtual-services/order-service.yaml
```

### Custom Health Check

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.networking.istio.io_DestinationRule: |
    hs = {}
    if obj.spec ~= nil and obj.spec.host ~= nil then
      hs.status = "Healthy"
      local subsets = obj.spec.subsets or {}
      hs.message = "Host: " .. obj.spec.host ..
        " (" .. tostring(#subsets) .. " subsets)"
    else
      hs.status = "Degraded"
      hs.message = "Missing host configuration"
    end
    return hs
```

## Pattern 1: Circuit Breaker Configuration

Circuit breakers prevent cascading failures. Define them in DestinationRules and manage through Git:

```yaml
# base/destination-rules/payment-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      # Eject a pod after 3 consecutive 5xx errors
      consecutive5xxErrors: 3
      # Check every 10 seconds
      interval: 10s
      # Eject for at least 30 seconds
      baseEjectionTime: 30s
      # Never eject more than 30% of pods
      maxEjectionPercent: 30
      # Also detect gateway errors
      consecutiveGatewayErrors: 3
```

Different environments might need different thresholds:

```yaml
# overlays/staging/destination-rules/payment-service-patch.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  trafficPolicy:
    outlierDetection:
      # More aggressive in staging for faster feedback
      consecutive5xxErrors: 1
      interval: 5s
      baseEjectionTime: 10s
      maxEjectionPercent: 50
```

```yaml
# overlays/production/destination-rules/payment-service-patch.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  trafficPolicy:
    outlierDetection:
      # More conservative in production
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 20
```

## Pattern 2: Mutual TLS Configuration

Enforce mutual TLS across services with DestinationRules:

```yaml
# base/destination-rules/default-mtls.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: default-mtls
  namespace: istio-system
spec:
  host: "*.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

For services that need specific TLS settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: external-api.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      caCertificates: /etc/certs/ca.pem
      sni: external-api.example.com
    portLevelSettings:
      - port:
          number: 443
        tls:
          mode: SIMPLE
          caCertificates: /etc/certs/ca.pem
```

## Pattern 3: Load Balancing Strategies

Different services benefit from different load balancing algorithms:

```yaml
# Round robin for stateless services
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: stateless-api
spec:
  host: stateless-api
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN

---
# Consistent hashing for session-sticky services
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: session-service
spec:
  host: session-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-session-id

---
# Least request for compute-heavy services
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: compute-service
spec:
  host: compute-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

## Pattern 4: Subset Management for Canary Deployments

DestinationRules define the subsets that VirtualServices reference for traffic splitting:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
spec:
  host: product-service
  subsets:
    - name: stable
      labels:
        version: v1
      trafficPolicy:
        connectionPool:
          http:
            http2MaxRequests: 1000
    - name: canary
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          http:
            # Lower limits for canary while testing
            http2MaxRequests: 100
```

When promoting the canary, update labels and traffic policies:

```bash
# In Git, update the DestinationRule subsets
# Once the canary is verified, the old v1 subset can
# be removed and v2 becomes the new stable
git commit -m "Promote product-service canary v2 to stable"
git push
# ArgoCD syncs the change
```

## Pattern 5: Port-Level Settings

Apply different policies to different service ports:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: multi-port-service
spec:
  host: multi-port-service
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          http:
            http1MaxPendingRequests: 200
        loadBalancer:
          simple: ROUND_ROBIN
      - port:
          number: 9090
        connectionPool:
          http:
            http2MaxRequests: 500
        loadBalancer:
          simple: LEAST_REQUEST
```

## Sync Ordering with VirtualServices

DestinationRules should be synced before VirtualServices that reference their subsets:

```yaml
# DestinationRule first (wave 0)
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  host: product-service
  subsets:
    - name: v1
      labels:
        version: v1

---
# VirtualService references subset from DestinationRule (wave 1)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  hosts:
    - product-service
  http:
    - route:
        - destination:
            host: product-service
            subset: v1
```

## Validating DestinationRules

Create a pre-sync validation job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-destination-rules
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validate
          image: istio/istioctl:1.21.0
          command:
            - sh
            - -c
            - |
              # Check for common DestinationRule issues
              istioctl analyze -n production \
                --output json 2>&1

              # Verify all referenced subsets have matching pods
              echo "Checking subset label selectors..."
              istioctl proxy-config cluster \
                deploy/istio-ingressgateway \
                -n istio-system -o json | \
                jq '.[] | select(.name | contains("product-service"))'
      restartPolicy: Never
  backoffLimit: 0
```

## Monitoring DestinationRule Effectiveness

Track whether your circuit breakers and load balancing are working:

```promql
# Outlier detection ejections
istio_tcp_connections_opened_total{
  destination_service="product-service.production.svc.cluster.local"
}

# Connection pool overflow
istio_requests_total{
  response_code="503",
  response_flags="UO"
}

# Load balancing distribution
sum(rate(istio_requests_total[5m])) by (
  destination_workload, destination_version
)
```

## Summary

DestinationRules are critical infrastructure configuration that defines how your service mesh handles traffic at the destination level. Managing them with ArgoCD brings the same GitOps benefits as any other Kubernetes resource - version control, pull request reviews, automated deployment, and drift detection. Use sync waves to ensure DestinationRules are applied before the VirtualServices that reference them, and leverage Kustomize overlays to tune traffic policies per environment.
