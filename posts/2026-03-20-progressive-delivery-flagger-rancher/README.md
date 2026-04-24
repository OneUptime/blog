# How to Configure Progressive Delivery with Flagger on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Progressive Delivery, Flagger, Canary, Blue-Green, Kubernetes

Description: Configure progressive delivery in Rancher using Flagger for automated canary releases and blue-green deployments with metric-based promotion and automatic rollback on SLO violations.

## Introduction

Progressive delivery extends continuous delivery by automatically controlling how much traffic reaches a new deployment version, using metrics to validate the release before full rollout. Flagger is a CNCF Kubernetes operator that automates canary releases and blue-green deployments, integrating with NGINX Ingress, Istio, or Linkerd for traffic splitting and Prometheus for metric-based gating.

## Step 1: Install Flagger

```bash
# Install Flagger with NGINX Ingress provider

helm repo add flagger https://flagger.app
helm repo update

# Assumes Prometheus is already reachable at prometheus.monitoring.svc:9090
helm install flagger flagger/flagger \
  --namespace flagger-system \
  --create-namespace \
  --set meshProvider=nginx \
  --set metricsServer=http://prometheus.monitoring.svc:9090

# Install Flagger load tester (generates test traffic)
helm install flagger-loadtester flagger/loadtester \
  --namespace flagger-system
```

## Step 2: Configure Canary Release

```yaml
# Canary resource for automatic progressive rollout
# Assumes an existing Ingress named api-server routes api.company.com to this service
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
  namespace: production
spec:
  provider: nginx
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  ingressRef:
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: api-server

  # Service configuration
  service:
    port: 80
    targetPort: 8080

  # Progressive rollout configuration
  progressDeadlineSeconds: 600
  analysis:
    # Time between traffic weight increments
    interval: 1m

    # Traffic increment per step
    stepWeight: 10

    # Maximum canary traffic weight
    maxWeight: 50

    # How long to wait before rolling back
    threshold: 5     # 5 failed checks → rollback

    # Metrics to evaluate at each step
    metrics:
      - name: request-success-rate
        # Fail if success rate < 99%
        thresholdRange:
          min: 99
        interval: 1m

      - name: request-duration
        # Fail if P99 > 500ms
        thresholdRange:
          max: 500
        interval: 1m

    # Webhooks (optional: run integration tests during rollout)
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.flagger-system/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://api-server-canary.production/health"

      - name: load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://api.company.com/"
```

## Step 3: Monitor Canary Progress

```bash
# Watch canary progression
kubectl describe canary api-server -n production

# Example output during rollout:
# Status:
#   Canary Weight: 30         ← Currently sending 30% traffic to canary
#   Failed Checks: 0
#   Phase: Progressing

# Watch events
kubectl get events -n production \
  --field-selector involvedObject.kind=Canary,involvedObject.name=api-server \
  --sort-by=.metadata.creationTimestamp -w

# Check current canary status
kubectl get canary api-server -n production \
  -o jsonpath='{.status}'
```

## Step 4: Blue-Green Deployment

```yaml
# Blue-green validates the new version, then switches traffic on promotion
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server-bg
  namespace: production
spec:
  provider: kubernetes
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server

  service:
    port: 80
    targetPort: 8080

  analysis:
    # Blue-green uses iterations instead of stepWeight/maxWeight
    # and switches traffic only after the analysis succeeds
    threshold: 5
    interval: 30s
    iterations: 10

    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99.5
        interval: 30s

    # Flagger keeps the stable deployment in place until promotion completes
```

## Step 5: Custom Metric Templates

```yaml
# Create custom Prometheus metric template
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: flagger-system
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring.svc:9090
  query: |
    100 - sum(
      rate(http_requests_total{
        namespace="{{ namespace }}",
        service="{{ target }}",
        status!~"5.."
      }[{{ interval }}])
    )
    /
    sum(
      rate(http_requests_total{
        namespace="{{ namespace }}",
        service="{{ target }}"
      }[{{ interval }}])
    ) * 100
```

## Step 6: Rollback Scenarios

```bash
# To allow operator-triggered rollback during analysis, add this webhook:
# analysis:
#   webhooks:
#     - name: rollback
#       type: rollback
#       url: http://flagger-loadtester.flagger-system/rollback/check

# Then trigger the rollback gate from the load tester pod
kubectl -n flagger-system exec deploy/flagger-loadtester -- \
  curl -d '{"name":"api-server","namespace":"production"}' \
  http://localhost:8080/rollback/open

# Automatic rollback triggers:
# - Success rate drops below 99%
# - P99 latency exceeds 500ms
# - 5 consecutive metric check failures

# Watch rollout and rollback events
kubectl get events -n production \
  --field-selector involvedObject.kind=Canary,involvedObject.name=api-server \
  --sort-by=.metadata.creationTimestamp -w

# After rollback, traffic stays on the primary version
# and the canary is scaled down
```

## Step 7: Notifications

```yaml
# Slack notifications for Flagger events
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack-platform
  namespace: flagger-system
spec:
  type: slack
  channel: deployments
  username: Flagger
  secretRef:
    name: slack-alert-provider
---
# Attach alert provider to canary
# Add to Canary spec:
spec:
  analysis:
    alerts:
      - name: "Platform team alerts"
        severity: warn
        providerRef:
          name: slack-platform
          namespace: flagger-system
```

## Conclusion

Flagger on Rancher automates the riskiest part of software delivery: promoting new versions to production. Canary releases gradually shift traffic while continuously validating success rate and latency metrics. If any metric violates the defined SLO threshold, Flagger automatically rolls back to the stable version without human intervention. This transforms deployment from a high-risk manual event into a safe, automated progression that teams can trigger from CI/CD pipelines with confidence.
