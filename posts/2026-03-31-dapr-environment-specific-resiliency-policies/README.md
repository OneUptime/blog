# How to Use Environment-Specific Dapr Resiliency Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Environment, Configuration, Circuit Breaker

Description: Configure different Dapr resiliency policies per environment - aggressive retries in development for visibility, conservative settings in staging, and production-tuned circuit breakers.

---

## Why Different Resiliency Policies Per Environment?

Resiliency policies that are ideal for production can mask bugs in development:
- **Development**: Low retry counts, short timeouts, fail-fast to surface errors quickly
- **Staging**: Moderate retries, realistic timeouts to test failure scenarios
- **Production**: Aggressive retries with exponential backoff, circuit breakers with tuned thresholds

## Development Resiliency Policy

```yaml
# kubernetes/development/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: dev-resiliency
  namespace: development
spec:
  policies:
    retries:
      quick-retry:
        policy: constant
        duration: 1s
        maxRetries: 2  # Fail quickly to surface issues
    circuitBreakers:
      dev-cb:
        maxRequests: 1
        interval: 10s
        timeout: 10s
        trip: consecutiveFailures >= 2  # Opens fast
    timeouts:
      short: 3s

  targets:
    apps:
      payment-service:
        retry: quick-retry
        circuitBreaker: dev-cb
        timeout: short
```

## Staging Resiliency Policy

```yaml
# kubernetes/staging/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: staging-resiliency
  namespace: staging
spec:
  policies:
    retries:
      standard-retry:
        policy: exponential
        initialInterval: 200ms
        maxInterval: 10s
        maxRetries: 5
        matching:
          httpStatusCodes: "429,500,502,503,504"
    circuitBreakers:
      staging-cb:
        maxRequests: 3
        interval: 20s
        timeout: 30s
        trip: consecutiveFailures >= 5
    timeouts:
      standard: 8s

  targets:
    apps:
      payment-service:
        retry: standard-retry
        circuitBreaker: staging-cb
        timeout: standard
      inventory-service:
        retry: standard-retry
        timeout: standard
    components:
      pubsub:
        inbound:
          retry: standard-retry
        outbound:
          retry: standard-retry
          timeout: standard
```

## Production Resiliency Policy

```yaml
# kubernetes/production/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: production-resiliency
  namespace: production
spec:
  policies:
    retries:
      critical-retry:
        policy: exponential
        initialInterval: 500ms
        maxInterval: 60s
        maxRetries: 10
        matching:
          httpStatusCodes: "429,500,502,503,504"
          gRPCStatusCodes: "2,14,4"

      non-critical-retry:
        policy: exponential
        initialInterval: 1s
        maxInterval: 30s
        maxRetries: 5

    circuitBreakers:
      payment-cb:
        maxRequests: 5
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 10

      default-cb:
        maxRequests: 3
        interval: 30s
        timeout: 45s
        trip: consecutiveFailures >= 7

    timeouts:
      fast: 3s
      standard: 10s
      slow: 30s

  targets:
    apps:
      payment-service:
        retry: critical-retry
        circuitBreaker: payment-cb
        timeout: standard

      order-service:
        retry: critical-retry
        circuitBreaker: default-cb
        timeout: standard

      reporting-service:
        retry: non-critical-retry
        timeout: slow

    components:
      statestore:
        outbound:
          retry: critical-retry
          timeout: fast
      pubsub:
        inbound:
          retry: critical-retry
        outbound:
          retry: critical-retry
          circuitBreaker: default-cb
```

## Kustomize for Environment-Specific Resiliency

```bash
# Apply environment-specific resiliency
kubectl apply -f kubernetes/development/resiliency.yaml -n development
kubectl apply -f kubernetes/staging/resiliency.yaml -n staging
kubectl apply -f kubernetes/production/resiliency.yaml -n production
```

```yaml
# Note: Resiliency became stable in Dapr v1.10 and no longer requires a feature flag.
# The following Configuration is only needed for Dapr v1.7 through v1.9:
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
  namespace: production
spec:
  features:
  - name: Resiliency
    enabled: true
```

## Testing Resiliency Policies

```bash
# Inject failures to test circuit breaker in staging
# Use chaos engineering tool or manual endpoint failure

# Check circuit breaker state via Dapr dashboard
kubectl port-forward svc/dapr-dashboard 8080:8080 -n dapr-system
# Access http://localhost:8080 to view components and configurations

# View resiliency metrics via Prometheus
curl http://localhost:9090/api/v1/query?query=dapr_resiliency_count
```

## Summary

Environment-specific Dapr resiliency policies ensure that each environment's fault-tolerance behavior matches its purpose. Development policies fail fast with minimal retries to surface bugs quickly. Staging uses moderate retry counts to simulate production behavior. Production policies use aggressive exponential backoff, carefully tuned circuit breaker thresholds, and separate retry policies for critical paths (payment) versus non-critical paths (reporting). Deploy policies using Kustomize overlays or Helm values to maintain a single source of truth for each environment tier.
