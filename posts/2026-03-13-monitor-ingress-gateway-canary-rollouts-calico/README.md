# Monitor Ingress Gateway Canary Rollouts with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Ingress Gateway, Canary, Rollouts, Kubernetes, Monitoring, Traffic Splitting

Description: Learn how to monitor canary deployments through Calico's ingress gateway, tracking traffic splitting ratios, error rates, and latency to safely validate new versions before full rollout.

---

## Introduction

Canary deployments route a small percentage of traffic to a new version of a service while the majority continues to reach the stable version. When combined with Calico's ingress gateway and the Gateway API's traffic splitting capabilities, canary rollouts become a powerful pattern for safely deploying changes to production.

Monitoring a canary rollout requires tracking traffic distribution accuracy (is 5% actually going to the canary?), comparing error rates and latency between the stable and canary versions, and having automated gates that halt or roll back the canary if metrics exceed defined thresholds.

This guide covers implementing canary traffic splitting with Calico's gateway, instrumenting the rollout with metrics, and building monitoring checks that can automatically validate or roll back the canary.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ and Gateway API CRDs installed
- Calico ingress gateway deployed and functional
- `kubectl` with admin access
- Prometheus and Grafana for metrics collection
- Argo Rollouts or similar controller (optional for automated promotion)

## Step 1: Set Up Canary Traffic Splitting

Configure HTTPRoute with weighted backends to implement traffic splitting.

Create an HTTPRoute that splits traffic between stable and canary backends:

```yaml
# canary-httproute.yaml - traffic splitting for canary rollout
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-canary-route
  namespace: production
  annotations:
    # Track canary rollout percentage for monitoring
    canary.deployment.io/weight: "10"
    canary.deployment.io/version: "v2.1.0"
spec:
  parentRefs:
  - name: production-gateway
    namespace: production
  hostnames:
  - "api.example.com"
  rules:
  - backendRefs:
    - name: api-stable
      port: 8080
      weight: 90        # 90% of traffic goes to stable version
    - name: api-canary
      port: 8080
      weight: 10        # 10% of traffic goes to canary version
```

Apply the canary route and verify traffic split is active:

```bash
kubectl apply -f canary-httproute.yaml

# Verify the route is accepted and programmed
kubectl get httproute api-canary-route -n production -o yaml | grep -A10 "status:"
```

## Step 2: Monitor Traffic Distribution Accuracy

Verify that traffic is actually splitting according to the configured weights.

Measure actual traffic distribution using Prometheus metrics:

```bash
# Port-forward to Prometheus for querying
kubectl port-forward svc/prometheus -n monitoring 9090:9090 &

# Query request count per backend to verify split ratio
# Stable backend requests:
# envoy_cluster_upstream_rq_total{cluster_name="production/api-stable/8080"}
# Canary backend requests:
# envoy_cluster_upstream_rq_total{cluster_name="production/api-canary/8080"}

# Calculate actual canary percentage:
# (canary_requests / (stable_requests + canary_requests)) * 100

# Generate test traffic to observe splitting
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/test
done
```

## Step 3: Compare Error Rates Between Stable and Canary

Monitor error rates for each backend to detect regressions in the canary.

Set up Prometheus alert rules to compare error rates:

```yaml
# canary-error-rate-alerts.yaml - compare error rates between stable and canary
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: canary-rollout-alerts
  namespace: monitoring
spec:
  groups:
  - name: canary-validation
    interval: 30s
    rules:
    - alert: CanaryHighErrorRate
      expr: |
        rate(envoy_cluster_upstream_rq_xx{
          cluster_name=~"production/api-canary.*",
          response_code_class="5"
        }[5m]) /
        rate(envoy_cluster_upstream_rq_total{
          cluster_name=~"production/api-canary.*"
        }[5m]) > 0.02   # Alert if canary error rate exceeds 2%
      for: 2m
      labels:
        severity: critical
        action: rollback
      annotations:
        summary: "Canary error rate {{ $value | humanizePercentage }} exceeds threshold"
    - alert: CanaryHighLatency
      expr: |
        histogram_quantile(0.95,
          rate(envoy_cluster_upstream_rq_time_bucket{
            cluster_name=~"production/api-canary.*"
          }[5m])
        ) > 
        histogram_quantile(0.95,
          rate(envoy_cluster_upstream_rq_time_bucket{
            cluster_name=~"production/api-stable.*"
          }[5m])
        ) * 1.5    # Alert if canary p95 is 50% higher than stable
      for: 3m
      labels:
        severity: warning
```

Apply the alert rules:

```bash
kubectl apply -f canary-error-rate-alerts.yaml
```

## Step 4: Implement Automated Canary Promotion or Rollback

Use metrics to automatically promote or roll back the canary.

Create a script that promotes the canary if metrics are healthy or rolls back if they fail:

```bash
#!/bin/bash
# canary-gate.sh - automated canary validation gate

CANARY_ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=rate(envoy_cluster_upstream_rq_xx{cluster_name=~"production/api-canary.*",response_code_class="5"}[5m])/rate(envoy_cluster_upstream_rq_total{cluster_name=~"production/api-canary.*"}[5m])' \
  | jq '.data.result[0].value[1]' | tr -d '"')

echo "Canary error rate: $CANARY_ERROR_RATE"

if (( $(echo "$CANARY_ERROR_RATE > 0.02" | bc -l) )); then
  echo "ERROR RATE TOO HIGH - Rolling back canary"
  # Set canary weight to 0 by patching the HTTPRoute
  kubectl patch httproute api-canary-route -n production --type=json \
    -p='[{"op":"replace","path":"/spec/rules/0/backendRefs/1/weight","value":0}]'
else
  echo "Canary healthy - proceeding with rollout"
fi
```

## Step 5: Monitor with OneUptime for User-Facing Validation

Set up external monitoring to validate the canary from the user's perspective.

Configure OneUptime monitors targeting the canary endpoint:

```bash
# Test the canary route specifically using a canary-specific header
curl -H "X-Canary: true" https://api.example.com/health

# Configure OneUptime monitors:
# 1. Standard health check: https://api.example.com/health (hits both stable and canary)
# 2. Canary-specific check: https://api.example.com/health with X-Canary header
# 3. Alert on response time > 500ms for canary check
# 4. Alert on any non-200 responses from canary endpoint
```

## Best Practices

- Start canary deployments at 1-5% traffic and increase in 10% increments after each validation phase
- Always compare canary metrics against baseline stable metrics, not absolute thresholds
- Use HTTP header-based routing alongside weight-based splitting for deterministic canary testing
- Monitor business metrics (e.g., conversion rates) alongside technical metrics (error rate, latency) for canary validation
- Configure OneUptime as the final gate for canary promotion to ensure real user traffic is healthy

## Conclusion

Canary rollouts through Calico's ingress gateway provide precise traffic control for safe production deployments. By combining Prometheus metrics for error rate and latency comparison, automated rollback gates, and external synthetic monitoring with OneUptime, you create a comprehensive canary validation pipeline. This approach ensures you catch regressions early and can roll back automatically before they impact the majority of users.
