# How to Implement Progressive Delivery with Istio and Flagger on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Flagger, Progressive Delivery, Kubernetes, Canary Deployment

Description: Learn how to implement automated progressive delivery using Istio and Flagger to safely roll out application updates with automatic analysis, promotion, and rollback based on metrics.

---

Progressive delivery extends continuous delivery by gradually rolling out changes while measuring their impact. Flagger automates canary deployments on Istio by incrementally shifting traffic to new versions, analyzing metrics, and automatically promoting or rolling back based on success criteria.

## Understanding Progressive Delivery with Flagger

Traditional deployments replace all instances at once or use basic blue-green switching. Progressive delivery releases changes incrementally, testing each step before proceeding. Flagger automates this process by controlling traffic shifts and evaluating metrics.

Flagger integrates with Istio to manage traffic splitting through VirtualServices. It monitors Prometheus metrics to determine if canary deployments succeed or fail. When metrics exceed thresholds, Flagger automatically rolls back. When metrics look good, it promotes the canary to production.

This removes human error from deployment decisions and enables confident automated releases based on real production data.

## Prerequisites

You need a Kubernetes cluster with Istio installed:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled
```

Install Flagger:

```bash
kubectl apply -k github.com/fluxcd/flagger//kustomize/istio
```

Verify Flagger is running:

```bash
kubectl get pods -n istio-system | grep flagger
```

## Deploying the Initial Application

Create a simple application deployment:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
      - name: podinfo
        image: ghcr.io/stefanprodan/podinfo:6.3.0
        ports:
        - containerPort: 9898
        env:
        - name: PODINFO_UI_COLOR
          value: "#34577c"
---
apiVersion: v1
kind: Service
metadata:
  name: podinfo
  namespace: default
spec:
  selector:
    app: podinfo
  ports:
  - port: 9898
    targetPort: 9898
```

```bash
kubectl apply -f app-deployment.yaml
```

## Creating a Canary Resource

Define a Canary resource that tells Flagger how to manage deployments:

```yaml
# canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
  analysis:
    # How often to run analysis
    interval: 1m
    # Number of checks before promotion
    threshold: 5
    # Max traffic percentage for canary
    maxWeight: 50
    # Traffic increase step
    stepWeight: 10
    # Metrics to check
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    # Webhooks for custom checks
    webhooks:
    - name: load-test
      url: http://flagger-loadtester.default/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.default:9898/"
```

```bash
kubectl apply -f canary.yaml
```

Flagger creates several resources:

- podinfo-primary deployment (production traffic)
- podinfo-canary deployment (canary traffic)
- VirtualService for traffic splitting

Check the status:

```bash
kubectl get canary podinfo
```

## Triggering a Canary Deployment

Update the deployment to trigger a canary:

```bash
kubectl set image deployment/podinfo podinfo=ghcr.io/stefanprodan/podinfo:6.3.1
```

Watch the canary progress:

```bash
kubectl describe canary podinfo
```

Flagger follows this process:

1. Detect deployment change
2. Scale up canary deployment
3. Start routing traffic (10%, 20%, 30%, 40%, 50%)
4. Run analysis at each step
5. Promote to primary if successful
6. Roll back if metrics fail

Check traffic distribution:

```bash
kubectl get virtualservice podinfo -o yaml
```

You'll see traffic weights changing as Flagger progresses through the canary.

## Configuring Metric Analysis

Customize metric thresholds for your application:

```yaml
# canary-metrics.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
  analysis:
    interval: 1m
    threshold: 10
    maxWeight: 50
    stepWeight: 5
    metrics:
    # Success rate must be above 99%
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    # P99 latency must be below 500ms
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    # Custom Prometheus query
    - name: error-rate
      templateRef:
        name: error-rate
        namespace: default
      thresholdRange:
        max: 1
      interval: 1m
```

Create a custom metric template:

```yaml
# metric-template.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    100 - sum(
      rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}",
          response_code!~"5.*"
        }[{{ interval }}]
      )
    )
    /
    sum(
      rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}"
        }[{{ interval }}]
      )
    ) * 100
```

```bash
kubectl apply -f metric-template.yaml
kubectl apply -f canary-metrics.yaml
```

## Implementing Automated Load Testing

Flagger can trigger load tests during canary analysis:

```bash
# Install Flagger load tester
kubectl apply -k github.com/fluxcd/flagger//kustomize/tester
```

Configure webhooks in your Canary:

```yaml
spec:
  analysis:
    webhooks:
    - name: load-test
      url: http://flagger-loadtester.default/
      timeout: 15s
      metadata:
        type: cmd
        cmd: "hey -z 2m -q 10 -c 2 http://podinfo-canary.default:9898/"
    - name: smoke-test
      url: http://flagger-loadtester.default/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "curl -s http://podinfo-canary.default:9898/status/200"
```

The load tester runs before analysis at each canary step.

## Configuring Canary Rollback

Flagger automatically rolls back when metrics fail:

```yaml
spec:
  analysis:
    interval: 1m
    threshold: 5
    iterations: 10
    # Match conditions for rollback
    match:
    - headers:
        x-canary:
          exact: "true"
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
```

When the success rate drops below 99%, Flagger:

1. Routes all traffic back to primary
2. Scales down canary
3. Marks the canary as failed

## Implementing A/B Testing

Use header-based routing for A/B tests:

```yaml
# canary-ab-testing.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
  analysis:
    interval: 1m
    threshold: 10
    iterations: 10
    # A/B testing with headers
    match:
    - headers:
        x-user-type:
          exact: "beta"
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
```

Only requests with `x-user-type: beta` header go to the canary. This enables testing with specific user segments.

## Monitoring Canary Deployments

Query Prometheus for canary metrics:

```promql
# Canary success rate
flagger_canary_status{name="podinfo"}

# Canary weight (traffic percentage)
flagger_canary_weight{name="podinfo"}

# Canary duration
flagger_canary_duration_seconds{name="podinfo"}
```

Set up Grafana dashboards to visualize canary progress.

## Integrating with Slack Notifications

Get notified about canary progress:

```yaml
spec:
  analysis:
    webhooks:
    - name: slack
      url: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
      timeout: 5s
      metadata:
        type: slack
        channel: deployments
        username: flagger
```

Flagger sends notifications when canary starts, progresses, succeeds, or fails.

## Conclusion

Progressive delivery with Istio and Flagger automates safe rollouts with built-in testing and automatic rollback. Define Canary resources that specify traffic shifting patterns and success metrics.

Flagger monitors Prometheus metrics and makes promotion decisions automatically. Configure custom metrics, load tests, and notifications to fit your requirements.

This removes human error from deployment decisions and enables confident automated releases based on production metrics. Start with conservative thresholds and gradually increase automation as you build confidence in your deployment process.
