# How to Configure Linkerd Retry and Timeout Policies with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Linkerd, Retry, Timeout, Resilience, Service Mesh

Description: Manage Linkerd retry and timeout policies using Flux CD to build resilient service-to-service communication with automatic failure recovery.

---

## Introduction

Retries and timeouts are two of the most important reliability patterns in distributed systems. Linkerd provides both through ServiceProfile (per-route configuration) and HTTPRoute (with Linkerd policy API). When configured correctly, retries absorb transient failures and timeouts prevent slow upstream services from cascading into system-wide slowdowns.

Managing these policies through Flux CD ensures your resilience configuration is version-controlled and consistent across environments. Tuning retry budgets or timeout values for a service is a pull request that security and reliability teams can review.

This guide covers configuring comprehensive retry and timeout policies in Linkerd using Flux CD.

## Prerequisites

- Kubernetes cluster with Linkerd installed
- Flux CD v2 bootstrapped to your Git repository
- Linkerd ServiceProfile CRD available

## Step 1: Configure Per-Route Retries in ServiceProfile

```yaml
# clusters/my-cluster/linkerd-resilience/api-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    # GET /api/users - Retry on 5xx errors, safe because it's idempotent
    - name: "GET /api/users"
      condition:
        method: GET
        pathRegex: /api/users(/.*)?
      isRetryable: true
      # Per-request timeout
      timeout: 3s

    # GET /api/products - Also retryable with shorter timeout
    - name: "GET /api/products"
      condition:
        method: GET
        pathRegex: /api/products(/.*)?
      isRetryable: true
      timeout: 2s

    # POST /api/checkout - NOT retryable (creates an order), long timeout
    - name: "POST /api/checkout"
      condition:
        method: POST
        pathRegex: /api/checkout
      isRetryable: false
      # Allow more time for checkout processing
      timeout: 15s

    # GET /api/reports - Expensive queries, longer timeout
    - name: "GET /api/reports"
      condition:
        method: GET
        pathRegex: /api/reports(/.*)?
      isRetryable: true
      timeout: 30s

  # Retry budget: limit retry amplification
  retryBudget:
    # Allow at most 20% of requests to be retries
    retryRatio: 0.2
    # Always allow at least 10 retries/second floor
    minRetriesPerSecond: 10
    # Budget window
    ttl: 10s
```

## Step 2: Configure HTTPRoute Timeouts

Using the newer policy API for timeout configuration:

```yaml
# clusters/my-cluster/linkerd-resilience/payment-httproute.yaml
apiVersion: policy.linkerd.io/v1beta3
kind: HTTPRoute
metadata:
  name: payment-service-timeouts
  namespace: production
spec:
  parentRefs:
    - name: payment-service
      kind: Service
      group: ""
      port: 8080
  rules:
    - matches:
        - method: POST
          path:
            type: PathPrefix
            value: /payments
      timeouts:
        # Total request timeout
        request: 10s
        # Idle timeout (no data transfer)
        idle: 5s
      backendRefs:
        - name: payment-service
          port: 8080
    - matches:
        - method: GET
          path:
            type: PathPrefix
            value: /payments
      timeouts:
        request: 3s
      backendRefs:
        - name: payment-service
          port: 8080
```

## Step 3: Configure Circuit-Breaking-Like Behavior

Linkerd does not have a traditional circuit breaker but uses latency-aware load balancing and retry budgets to achieve similar effects:

```yaml
# clusters/my-cluster/linkerd-resilience/resilience-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: inventory-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    - name: "GET /inventory"
      condition:
        method: GET
        pathRegex: /inventory(/.*)?
      isRetryable: true
      # Short timeout to fail fast on slow inventory service
      timeout: 500ms

    - name: "POST /inventory/reserve"
      condition:
        method: POST
        pathRegex: /inventory/reserve
      isRetryable: false
      timeout: 2s

  # Tight retry budget prevents overwhelming a struggling service
  retryBudget:
    retryRatio: 0.1   # Only 10% retry amplification
    minRetriesPerSecond: 5
    ttl: 10s
```

## Step 4: Observe Retry Effectiveness

```yaml
# clusters/my-cluster/linkerd-resilience/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - api-profile.yaml
  - payment-httproute.yaml
  - resilience-profile.yaml
---
# clusters/my-cluster/flux-kustomization-linkerd-resilience.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: linkerd-resilience
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: linkerd
  path: ./clusters/my-cluster/linkerd-resilience
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 5: Monitor Retry Rates and Timeouts

```bash
# Apply Flux reconciliation
flux reconcile kustomization linkerd-resilience

# View per-route metrics including retry rates
linkerd viz routes deployment/api-service -n production

# Expected output shows:
# ROUTE                    SUCCESS    RPS   LATENCY_P50  LATENCY_P95  LATENCY_P99
# GET /api/users           99.80%    50.0       12ms         25ms         45ms
# POST /api/checkout       98.50%    10.0       80ms        150ms        300ms

# Check actual retry counts from Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n linkerd-viz
# Query: sum(rate(response_total{classification="retry"}[1m])) by (authority)

# Run Linkerd's resilience checker
linkerd viz stat deploy/api-service -n production
```

## Best Practices

- Set `retryBudget.retryRatio` conservatively (0.1-0.2) to prevent retry storms during outages - retries should absorb transient errors, not amplify load on a struggling service.
- Use short timeouts (under 1 second) for fast internal services and reserve longer timeouts for operations that inherently require more time (report generation, batch processing).
- Never mark POST, PUT, or DELETE routes as `isRetryable: true` unless you have verified the endpoint is idempotent - retried non-idempotent operations can cause duplicate transactions.
- Set timeouts shorter at the calling service and longer at the called service to ensure the caller's timeout fires before the server's, giving clean error propagation.
- Monitor per-route retry rates with Prometheus - a route retrying more than 10% of requests indicates a reliability problem that needs investigation, not just more retries.

## Conclusion

Configuring Linkerd retry and timeout policies through Flux CD creates a resilient, GitOps-managed service communication layer. Retry budgets, per-route timeouts, and idempotency annotations are all tracked in Git, enabling reliability engineers to tune failure recovery behavior through code review - with the full history of every change available for post-incident analysis.
