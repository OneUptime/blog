# How to Configure Flagger Canary Promotion Thresholds in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, flagger, canary, promotion, thresholds, kubernetes, gitops, progressive-delivery

Description: A practical guide to configuring Flagger canary promotion thresholds in Flux CD to control when canary deployments are promoted to production.

---

## Introduction

Flagger is a progressive delivery operator that works with Flux CD to automate canary deployments. One of its most powerful features is the ability to configure promotion thresholds -- the conditions that must be met before a canary version is promoted to production.

Getting these thresholds right is critical. Too lenient, and you risk promoting broken releases. Too strict, and deployments stall unnecessarily. This guide walks through how to configure promotion thresholds effectively in a Flux-managed cluster.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- Flagger installed in your cluster
- A metrics provider (Prometheus recommended)
- Basic familiarity with Flux GitOps workflows

## Understanding Canary Promotion Thresholds

Flagger uses a `Canary` custom resource to define how deployments are promoted. The promotion thresholds live inside the `analysis` section and control:

- **Threshold**: The number of failed metric checks before a rollback is triggered
- **Max Weight**: The maximum percentage of traffic routed to the canary
- **Step Weight**: The increment of traffic shift per analysis interval
- **Iterations**: The number of successful checks required before promotion

## Step 1: Install Flagger with Flux

First, add Flagger to your Flux configuration using a HelmRelease.

```yaml
# flagger/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flagger-system
```

```yaml
# flagger/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: flagger
  namespace: flagger-system
spec:
  interval: 1h
  url: https://flagger.app
```

```yaml
# flagger/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: flagger
  namespace: flagger-system
spec:
  interval: 1h
  chart:
    spec:
      chart: flagger
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: flagger
      interval: 1h
  values:
    # Use Istio as the mesh provider
    meshProvider: istio
    # Enable Prometheus metrics
    metricsServer: http://prometheus.monitoring:9090
```

## Step 2: Define a Basic Canary with Promotion Thresholds

Create a Canary resource that defines your promotion criteria.

```yaml
# apps/my-app/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  # Reference the deployment to canary
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  # The service that Flagger will manage
  service:
    port: 80
    targetPort: 8080
  analysis:
    # Number of analysis intervals to run before promotion
    # The canary must pass this many consecutive checks
    iterations: 10
    # Time between each analysis check
    interval: 1m
    # Maximum number of failed checks before rollback
    # Lower values mean stricter rollback behavior
    threshold: 2
    # Maximum traffic weight routed to canary
    maxWeight: 50
    # Traffic weight increment per successful check
    stepWeight: 5
```

## Step 3: Configure Metric-Based Thresholds

Flagger supports custom metric templates for fine-grained promotion control.

```yaml
# apps/my-app/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    iterations: 10
    interval: 1m
    threshold: 2
    maxWeight: 50
    stepWeight: 5
    metrics:
      # Built-in request success rate metric
      - name: request-success-rate
        # Minimum success rate percentage required
        # Canary fails if success rate drops below this
        thresholdRange:
          min: 99
        interval: 1m
      # Built-in request duration metric
      - name: request-duration
        # Maximum p99 latency in milliseconds
        # Canary fails if latency exceeds this value
        thresholdRange:
          max: 500
        interval: 1m
```

## Step 4: Create Custom Metric Templates

For more advanced scenarios, define custom metric templates.

```yaml
# apps/my-app/metric-template.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    # Calculate the error rate for the canary version
    # This query returns the percentage of 5xx responses
    100 - sum(
      rate(
        http_requests_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-canary-[0-9a-zA-Z]+",
          status!~"5.*"
        }[{{ interval }}]
      )
    )
    /
    sum(
      rate(
        http_requests_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-canary-[0-9a-zA-Z]+"
        }[{{ interval }}]
      )
    ) * 100
```

Now reference this custom metric in your canary:

```yaml
# apps/my-app/canary.yaml (analysis section)
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
      # Custom metric using the template
      - name: error-rate
        templateRef:
          name: error-rate
          namespace: production
        # Maximum error rate allowed (in percentage)
        thresholdRange:
          max: 1
        interval: 1m
```

## Step 5: Configure Webhook-Based Promotion Gates

Add webhooks to enforce additional promotion conditions beyond metrics.

```yaml
# apps/my-app/canary.yaml (analysis section)
    webhooks:
      # Run integration tests before traffic shifting begins
      - name: integration-tests
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 5m
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.production:8080/healthz"
      # Run load tests during the canary analysis
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5m
        metadata:
          type: cmd
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.production:8080/"
      # Confirm promotion with an external system
      - name: promotion-gate
        type: confirm-promotion
        url: http://my-approval-service.production/api/approve
```

## Step 6: Tune Thresholds for Different Environments

Different environments require different threshold configurations.

```yaml
# environments/staging/canary-patch.yaml
# Staging: more lenient thresholds for faster iteration
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: staging
spec:
  analysis:
    # Fewer iterations in staging
    iterations: 5
    interval: 30s
    # Higher failure tolerance in staging
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          # Lower success rate requirement in staging
          min: 95
        interval: 30s
```

```yaml
# environments/production/canary-patch.yaml
# Production: strict thresholds for safety
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  analysis:
    # More iterations in production for confidence
    iterations: 15
    interval: 2m
    # Very low failure tolerance in production
    threshold: 1
    maxWeight: 30
    stepWeight: 2
    metrics:
      - name: request-success-rate
        thresholdRange:
          # High success rate requirement in production
          min: 99.9
        interval: 2m
      - name: request-duration
        thresholdRange:
          # Tight latency requirement
          max: 200
        interval: 2m
```

## Step 7: Use Kustomize Overlays with Flux

Integrate your canary thresholds into a Flux Kustomization structure.

```yaml
# flux/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-app
  path: ./environments/production
  prune: true
  # Health checks ensure Flux waits for canary completion
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
```

## Step 8: Monitor Promotion Threshold Behavior

Check the status of your canary to see how thresholds are being evaluated.

```bash
# Check canary status
kubectl get canary my-app -n production

# View detailed canary conditions
kubectl describe canary my-app -n production

# Watch canary events in real time
kubectl get events -n production --field-selector involvedObject.name=my-app --watch

# Check Flagger logs for threshold decisions
kubectl logs -n flagger-system deployment/flagger -f | grep my-app
```

## Common Threshold Configurations

Here is a reference table for common threshold patterns:

| Scenario | iterations | threshold | stepWeight | maxWeight | Success Rate |
|----------|-----------|-----------|------------|-----------|-------------|
| Conservative | 15 | 1 | 2 | 30 | 99.9% |
| Balanced | 10 | 2 | 5 | 50 | 99% |
| Aggressive | 5 | 5 | 10 | 80 | 95% |
| Blue/Green | 10 | 1 | - | - | 99.5% |

## Troubleshooting

### Canary Stuck in Progressing State

If the canary never promotes, check that your metrics provider is returning valid data:

```bash
# Verify Prometheus can reach your metrics
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Test the metric query manually in Prometheus UI
# Ensure the query returns a numeric value
```

### Canary Rolls Back Too Quickly

If the canary rolls back before gathering enough data, increase the threshold value and ensure your interval gives enough time for metrics to stabilize:

```yaml
analysis:
  # Give more chances before rolling back
  threshold: 5
  # Longer interval to let metrics settle
  interval: 2m
```

## Summary

Configuring Flagger canary promotion thresholds in Flux requires balancing safety with deployment speed. Start with conservative thresholds and gradually relax them as you gain confidence in your metrics and testing. Use custom metric templates for application-specific checks and leverage webhooks for integration testing gates. Different environments should have different threshold configurations to optimize the development workflow while protecting production.
