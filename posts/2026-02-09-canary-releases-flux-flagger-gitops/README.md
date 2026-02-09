# How to Implement Canary Releases with Flux and Flagger Using GitOps Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, Flagger, Canary Deployment, Progressive Delivery, GitOps

Description: Learn how to implement automated canary deployments using Flux and Flagger to gradually roll out changes with automated rollback based on metrics.

---

GitOps automates deployments, but instant rollouts of new versions carry risk. What if the new code has a bug that only shows under production load? Canary releases solve this by gradually shifting traffic to new versions while monitoring metrics. Flagger automates this process, integrating seamlessly with Flux for GitOps-driven progressive delivery.

This guide walks you through implementing production-ready canary deployments with Flux and Flagger.

## Why Canary Deployments

Traditional deployments are binary: old version or new version, nothing in between. Canary deployments incrementally shift traffic:

- Deploy new version alongside old version
- Route 5% of traffic to new version
- Monitor error rates, latency, and custom metrics
- If metrics look good, increase to 10%, then 25%, 50%, 100%
- If metrics degrade, automatically rollback

This catches production issues before they impact all users.

## Installing Flagger

Flagger requires a service mesh or ingress controller. This example uses Istio, but Flagger supports Linkerd, App Mesh, NGINX, and others.

Install Flagger with Flux:

```yaml
# infrastructure/flagger/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flagger-system
---
# infrastructure/flagger/release.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: flagger
  namespace: flagger-system
spec:
  interval: 1h
  url: https://flagger.app
---
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: flagger
  namespace: flagger-system
spec:
  interval: 10m
  chart:
    spec:
      chart: flagger
      sourceRef:
        kind: HelmRepository
        name: flagger
      version: 1.34.x
  values:
    meshProvider: istio
    metricsServer: http://prometheus.monitoring:9090
```

Apply with Flux:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flagger
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/flagger
  prune: true
  wait: true
```

## Preparing Your Application

Flagger manages your deployment. Start with a standard Kubernetes deployment:

```yaml
# apps/production/podinfo/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: production
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
        image: ghcr.io/stefanprodan/podinfo:6.5.0
        ports:
        - containerPort: 9898
          name: http
        - containerPort: 9797
          name: grpc
        livenessProbe:
          httpGet:
            path: /healthz
            port: 9898
        readinessProbe:
          httpGet:
            path: /readyz
            port: 9898
---
apiVersion: v1
kind: Service
metadata:
  name: podinfo
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: podinfo
  ports:
  - port: 9898
    targetPort: http
    name: http
```

## Creating a Canary Resource

Define canary deployment strategy with Flagger:

```yaml
# apps/production/podinfo/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: production
spec:
  # Reference to deployment
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo

  # HPA reference (optional)
  autoscalerRef:
    apiVersion: autoscaling/v2
    kind: HorizontalPodAutoscaler
    name: podinfo

  # Service port
  service:
    port: 9898
    targetPort: 9898

  # Canary analysis configuration
  analysis:
    # Schedule interval
    interval: 1m

    # Max traffic percentage routed to canary
    threshold: 5

    # Max number of failed checks before rollback
    maxWeight: 50

    # Increment weight by this step
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

    # Webhook tests (optional)
    webhooks:
    - name: load-test
      url: http://flagger-loadtester.flagger-system/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "hey -z 1m -q 10 -c 2 http://podinfo.production:9898/"
```

This configuration:
- Starts with 10% traffic to canary
- Increases by 10% each minute if metrics pass
- Requires 99% success rate and sub-500ms latency
- Rolls back if any check fails

## Metrics Analysis

Flagger queries Prometheus for metrics. The built-in metrics work with Istio:

```yaml
metrics:
  # Success rate: percentage of non-5xx responses
  - name: request-success-rate
    thresholdRange:
      min: 99
    interval: 1m

  # Request duration: 99th percentile latency
  - name: request-duration
    thresholdRange:
      max: 500
    interval: 1m

  # Error rate: percentage of 5xx responses
  - name: request-error-rate
    thresholdRange:
      max: 1
    interval: 1m
```

## Custom Metrics

Add custom Prometheus queries:

```yaml
metrics:
  - name: error-rate
    templateRef:
      name: error-rate
      namespace: flagger-system
    thresholdRange:
      max: 5
    interval: 1m
```

Define the metric template:

```yaml
# infrastructure/flagger/metric-templates.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: flagger-system
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(
      http_requests_total{
        namespace="{{ namespace }}",
        deployment="{{ target }}",
        status=~"5.*"
      }[{{ interval }}]
    ))
    /
    sum(rate(
      http_requests_total{
        namespace="{{ namespace }}",
        deployment="{{ target }}"
      }[{{ interval }}]
    )) * 100
```

## Webhook Testing

Run automated tests during canary analysis:

```yaml
# Install load testing service
apiVersion: v1
kind: Service
metadata:
  name: flagger-loadtester
  namespace: flagger-system
spec:
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: flagger-loadtester
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flagger-loadtester
  namespace: flagger-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flagger-loadtester
  template:
    metadata:
      labels:
        app: flagger-loadtester
    spec:
      containers:
      - name: loadtester
        image: ghcr.io/fluxcd/flagger-loadtester:0.29.0
        ports:
        - containerPort: 8080
```

Configure webhooks in the Canary:

```yaml
analysis:
  webhooks:
  # Pre-rollout webhook
  - name: pre-rollout
    type: pre-rollout
    url: http://flagger-loadtester.flagger-system/
    timeout: 5s
    metadata:
      type: bash
      cmd: "curl -sd 'test' http://podinfo.production:9898/token | grep token"

  # Load test during rollout
  - name: load-test
    url: http://flagger-loadtester.flagger-system/
    timeout: 5s
    metadata:
      type: cmd
      cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.production:9898/"

  # Post-rollout webhook
  - name: post-rollout
    type: post-rollout
    url: http://flagger-loadtester.flagger-system/
    metadata:
      type: bash
      cmd: "curl -X POST http://slack.com/webhook -d '{\"text\":\"Canary rollout completed\"}'"
```

## Triggering a Canary Release

Update the deployment image with Flux. Commit to Git:

```yaml
# apps/production/podinfo/deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: podinfo
        image: ghcr.io/stefanprodan/podinfo:6.5.1  # New version
```

Flux syncs the change. Flagger detects it and:
1. Creates a canary deployment with new version
2. Routes 10% traffic to canary
3. Monitors metrics for 1 minute
4. If successful, increases to 20%
5. Continues until 50% or rollback
6. Promotes canary to primary
7. Scales down old version

## Monitoring Canary Progress

Watch the canary status:

```bash
kubectl get canary -n production -w

# Detailed status
kubectl describe canary podinfo -n production
```

Status shows current weight and analysis results:

```
Status:
  Canary Weight: 30
  Failed Checks: 0
  Iterations: 3
  Phase: Progressing
  Conditions:
    Last Transition Time:  2026-02-09T10:15:00Z
    Message:              Canary analysis progressing (30% traffic)
    Reason:               Progressing
    Status:               True
    Type:                 Promoted
```

## Automatic Rollback

If metrics fail, Flagger automatically rolls back:

```yaml
Status:
  Phase: Failed
  Failed Checks: 5
  Conditions:
    Message: Canary failed: request-success-rate (95%) < 99%
    Reason: Failed
```

The old version continues serving 100% of traffic.

## Advanced Configuration

### Blue/Green Deployment

Switch to blue/green instead of canary:

```yaml
spec:
  analysis:
    interval: 1m
    threshold: 10
    iterations: 10
    # Route all traffic at once after validation
    canaryAnalysis:
      threshold: 10
      maxWeight: 0
      stepWeight: 100
```

### A/B Testing

Route traffic based on HTTP headers:

```yaml
spec:
  analysis:
    interval: 1m
    threshold: 10
    iterations: 10
    match:
    - headers:
        user-agent:
          regex: ".*Mobile.*"
    - headers:
        cookie:
          exact: "canary=true"
```

### Traffic Mirroring

Mirror traffic to canary without serving responses:

```yaml
spec:
  analysis:
    interval: 1m
    threshold: 10
    mirror: true
    mirrorWeight: 100
```

## GitOps Workflow

Complete GitOps workflow with Flux and Flagger:

```
Developer pushes code
    ↓
CI builds image
    ↓
Update image tag in Git
    ↓
Flux syncs deployment
    ↓
Flagger detects change
    ↓
Canary rollout starts
    ↓
Metrics monitored
    ↓
Success → Promote | Failure → Rollback
```

Everything is automated, auditable via Git history.

## Multi-Environment Strategy

Use different canary strategies per environment:

```yaml
# Staging: Fast rollout for quick feedback
spec:
  analysis:
    interval: 30s
    stepWeight: 25
    maxWeight: 50

# Production: Slow, careful rollout
spec:
  analysis:
    interval: 5m
    stepWeight: 10
    maxWeight: 50
```

## Notifications

Integrate with notification systems:

```yaml
analysis:
  webhooks:
  - name: notify-slack
    type: rollout
    url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
  - name: notify-pagerduty
    type: rollout-failure
    url: https://events.pagerduty.com/v2/enqueue
```

## Best Practices

1. **Start conservative**: Use small step weights and long intervals initially
2. **Monitor multiple metrics**: Don't rely on a single metric
3. **Set realistic thresholds**: Too strict causes false rollbacks
4. **Test rollback**: Deliberately deploy a broken version to verify rollback works
5. **Use load testing**: Synthetic load during canary reveals issues
6. **Gradual migration**: Move one service at a time to canary deployments
7. **Document metrics**: Clearly explain what each metric measures

## Conclusion

Flagger brings automated progressive delivery to Flux GitOps workflows. Define canary strategies in Git, commit changes, and let Flagger handle the gradual rollout with automated monitoring and rollback. This eliminates the fear of production deployments while maintaining GitOps principles. Start with simple configurations, add custom metrics as you learn what matters for your services, and scale to full progressive delivery across your platform.
