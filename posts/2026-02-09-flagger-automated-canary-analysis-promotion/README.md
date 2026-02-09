# How to Use Flagger for Automated Canary Analysis and Promotion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flagger, Progressive Delivery

Description: Learn how to use Flagger to automate canary deployments with metric analysis, automatic promotion on success, and automatic rollback on failure for safer Kubernetes releases.

---

Manual canary deployments require constant monitoring. You deploy the canary, watch dashboards, check metrics, and decide whether to promote or rollback. This takes time and requires someone to be available during the deployment window.

Flagger automates this entire process by continuously analyzing metrics and making deployment decisions for you.

## What Flagger Does

Flagger is a progressive delivery operator for Kubernetes. It automates canary deployments by:

- Gradually shifting traffic to the new version
- Analyzing metrics from Prometheus, Datadog, or other sources
- Automatically promoting the canary if metrics are healthy
- Automatically rolling back if metrics indicate problems
- Sending notifications about deployment progress

Instead of babysitting your deployment, you define success criteria and let Flagger handle the rest.

## Installing Flagger

Install Flagger with Helm:

```bash
# Add the Flagger Helm repository
helm repo add flagger https://flagger.app

# Install Flagger for Istio (or use linkerd, nginx, etc.)
helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus:9090

# Verify installation
kubectl -n istio-system get deployment flagger
```

Flagger works with multiple service meshes and ingress controllers:
- Istio
- Linkerd
- AWS App Mesh
- Nginx Ingress
- Contour
- Gloo Edge

## Basic Canary Configuration

Create a Canary resource that defines your deployment strategy:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
  namespace: production
spec:
  # Target deployment to automate
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  # Service configuration
  service:
    port: 80
    targetPort: 8080
  # Canary analysis
  analysis:
    # Schedule interval for analysis
    interval: 1m
    # Max number of failed checks before rollback
    threshold: 5
    # Max traffic percentage routed to canary
    maxWeight: 50
    # Traffic increment step percentage
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
```

This configuration:
- Analyzes metrics every minute
- Increases canary traffic by 10% at each step
- Maximum 50% traffic to canary
- Rolls back after 5 failed metric checks
- Requires 99% success rate
- Requires response time under 500ms

## How Flagger Works

When you update your deployment, Flagger:

1. Detects the change and pauses it
2. Creates a canary deployment with the new version
3. Starts with 0% traffic to canary
4. Gradually increases traffic in steps (10%, 20%, 30%, etc.)
5. At each step, analyzes metrics for the defined interval
6. Promotes if all metrics pass
7. Rolls back if metrics fail threshold times

Watch it in action:

```bash
# Update the deployment
kubectl set image deployment/api-server \
  api=myregistry.io/api-server:v2.0.0

# Watch Flagger's progress
kubectl describe canary api-server
```

You'll see events like:

```
Events:
  Type     Reason  Age   Message
  ----     ------  ----  -------
  Normal   Synced  3m    New revision detected api-server.production
  Normal   Synced  3m    Scaling up api-server.production
  Warning  Synced  2m    Waiting for api-server.production rollout to finish: 0 of 1 updated replicas are available
  Normal   Synced  2m    Advance api-server.production canary weight 10
  Normal   Synced  1m    Advance api-server.production canary weight 20
  Normal   Synced  1m    Advance api-server.production canary weight 30
  Normal   Synced  30s   Copying api-server.production template spec to api-server-primary.production
  Normal   Synced  15s   Promotion completed! Scaling down api-server.production
```

## Defining Custom Metrics

Use custom Prometheus queries for more sophisticated analysis:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    # Built-in request success rate
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    # Custom metric: error rate
    - name: error-rate
      templateRef:
        name: error-rate
        namespace: production
      thresholdRange:
        max: 0.01
      interval: 1m
    # Custom metric: database latency
    - name: database-latency
      templateRef:
        name: database-latency
        namespace: production
      thresholdRange:
        max: 100
      interval: 1m
---
# Metric template for error rate
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus:9090
  query: |
    sum(rate(
      http_requests_total{
        kubernetes_namespace="{{ namespace }}",
        kubernetes_pod_name=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",
        status=~"5.."
      }[{{ interval }}]
    ))
    /
    sum(rate(
      http_requests_total{
        kubernetes_namespace="{{ namespace }}",
        kubernetes_pod_name=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
      }[{{ interval }}]
    ))
---
# Metric template for database latency
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: database-latency
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus:9090
  query: |
    histogram_quantile(0.99,
      sum(rate(
        database_query_duration_seconds_bucket{
          kubernetes_namespace="{{ namespace }}",
          kubernetes_pod_name=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
        }[{{ interval }}]
      )) by (le)
    )
```

Flagger substitutes `{{ namespace }}`, `{{ target }}`, and `{{ interval }}` with actual values during analysis.

## Webhook Notifications

Send notifications to Slack, Discord, or Microsoft Teams:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    webhooks:
    # Pre-rollout webhook
    - name: load-test
      type: pre-rollout
      url: http://load-tester.production/start
      timeout: 5s
      metadata:
        type: bash
        cmd: "curl -X POST http://load-tester.production/start"
    # Rollout status webhook (Slack)
    - name: slack-notification
      type: event
      url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
      metadata:
        slack:
          channel: deployments
          username: flagger
```

## Load Testing Integration

Automatically run load tests during canary analysis to generate traffic:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: load-test
  namespace: production
data:
  load-test.sh: |
    #!/bin/bash
    hey -z 1m -q 10 -c 2 http://api-server.production/health
---
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    iterations: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    webhooks:
    - name: load-test
      type: rollout
      url: http://flagger-loadtester.production/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "hey -z 1m -q 10 -c 2 http://api-server-canary.production:80/health"
```

The load tester runs on each analysis iteration, ensuring the canary receives consistent traffic.

## Session Affinity

For stateful applications, ensure users stick to the same version:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  service:
    port: 80
    sessionAffinity:
      cookieName: flagger-cookie
      maxAge: 86400  # 24 hours
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
```

This creates sticky sessions based on cookies, ensuring consistent user experience during rollout.

## Blue-Green Deployments

Flagger also supports blue-green deployments with manual or automatic promotion:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    iterations: 10
    # Blue-Green strategy
    strategy:
      blueGreen:
        enabled: true
        # Require manual approval
        confirmation: true
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
```

With blue-green:
- Green version runs alongside blue
- Metrics are analyzed
- If metrics pass, Flagger waits for confirmation
- After confirmation, traffic switches from blue to green

Approve the promotion:

```bash
# Check canary status
kubectl get canary api-server

# Approve promotion
kubectl annotate canary api-server \
  flagger.app/confirm=approve
```

## Multi-Cluster Canary

Deploy canaries across multiple clusters:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  service:
    port: 80
    # Match pods across clusters
    meshProvider: istio
    backends:
    - cluster-1
    - cluster-2
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
      # Aggregate metrics from all clusters
      templateRef:
        name: multi-cluster-success-rate
```

This requires a service mesh with multi-cluster support like Istio.

## Monitoring Flagger

Track Flagger's own metrics:

```promql
# Number of canaries being analyzed
flagger_canary_total

# Canary duration in seconds
flagger_canary_duration_seconds

# Canary status (0=failed, 1=succeeded)
flagger_canary_status
```

Alert on failed canaries:

```yaml
groups:
- name: flagger_alerts
  rules:
  - alert: CanaryFailed
    expr: flagger_canary_status == 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Canary {{ $labels.name }} failed"
      description: "Canary deployment {{ $labels.name }} in namespace {{ $labels.namespace }} has failed and rolled back"
```

## Best Practices

**Start with conservative thresholds**. It's better to roll back a good deployment than to promote a bad one. You can always loosen thresholds later.

**Use multiple metrics**. Don't rely on just request success rate. Monitor latency, error rates, and business metrics.

**Test your metric queries**. Run them manually in Prometheus before using them in Flagger to ensure they return expected values.

**Generate sufficient load**. Canary analysis only works if the canary receives enough traffic for meaningful metrics. Use load testing webhooks if necessary.

**Monitor Flagger itself**. Set up alerts for when Flagger fails to perform analysis or encounters errors.

**Document your canary strategy**. Add annotations to your Canary resources explaining why you chose specific thresholds:

```yaml
metadata:
  annotations:
    deployment.kubernetes.io/canary-strategy: |
      Conservative 10% steps with 99% success rate requirement.
      5 failure threshold allows for temporary blips without rollback.
```

## Conclusion

Flagger transforms canary deployments from manual, error-prone processes into automated, reliable operations. Define your success criteria once, and Flagger handles every subsequent deployment with consistent analysis and decision-making.

Start with simple metrics like request success rate, then expand to include latency, error rates, and business metrics. Let Flagger make deployment decisions based on real production data, freeing your team to focus on building features instead of babysitting deployments.
