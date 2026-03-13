# How to Implement Canary Deployments with Istio and Flagger

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Canary Deployments, Flagger, Progressive Delivery

Description: Step-by-step guide to implementing automated canary deployments using Istio for traffic splitting and Flagger for progressive delivery automation.

---

Canary deployments let you roll out changes to a small percentage of users first, monitor how the new version behaves, and gradually increase traffic if everything looks good. Istio provides the traffic splitting mechanism, and Flagger automates the whole process. Together, they give you a deployment pipeline that catches bad releases before they affect all your users.

This guide walks through setting up Flagger with Istio from scratch, including installation, configuration, and running your first automated canary deployment.

## Installing Flagger

Flagger runs as a Kubernetes controller that watches your deployments and manages the canary process. Install it with Helm:

```bash
helm repo add flagger https://flagger.app
helm repo update

helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus:9090
```

Flagger needs access to Prometheus to query metrics for canary analysis. Make sure the `metricsServer` URL points to your Prometheus instance. If you installed Istio's Prometheus addon:

```bash
helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus.istio-system:9090
```

Verify Flagger is running:

```bash
kubectl get pods -n istio-system -l app.kubernetes.io/name=flagger
```

## Setting Up the Deployment

Flagger works with standard Kubernetes Deployments. It creates a primary and canary version automatically. Start with your regular deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: app
        image: my-app:1.0.0
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

You also need a Service (but not a VirtualService; Flagger creates that):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
spec:
  ports:
  - port: 80
    name: http
    targetPort: 8080
  selector:
    app: my-app
```

## Creating the Canary Resource

The Canary custom resource tells Flagger how to manage the deployment:

```yaml
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
    gateways:
    - mesh
    hosts:
    - my-app
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 30s
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 30s
```

Apply this and Flagger initializes:

```bash
kubectl apply -f canary.yaml
```

Flagger creates several resources:
- `my-app-primary` Deployment (copy of your original)
- `my-app-primary` Service
- `my-app-canary` Service
- VirtualService with traffic routing rules
- DestinationRule with subsets

Check the status:

```bash
kubectl get canary my-app -n production
```

## Understanding the Canary Analysis

The `analysis` section defines the canary behavior:

- `interval: 30s` - Check metrics every 30 seconds
- `threshold: 5` - Allow 5 failed checks before rolling back
- `maxWeight: 50` - Send up to 50% of traffic to the canary
- `stepWeight: 10` - Increase canary traffic by 10% at each step
- `metrics` - Conditions that must be met for the canary to advance

With these settings, a canary deployment progresses like this:

1. New version detected, canary created with 0% traffic
2. After 30s: check metrics, if OK, canary gets 10% traffic
3. After 60s: check metrics, if OK, canary gets 20% traffic
4. Continue until 50% is reached
5. Promote: canary becomes the new primary, all traffic shifts

If any metric check fails, the failure counter increments. After 5 failures, Flagger rolls back.

## Triggering a Canary Deployment

To trigger a canary, update the deployment's container image:

```bash
kubectl set image deployment/my-app app=my-app:2.0.0 -n production
```

Or update any field in the pod template (environment variables, resource limits, etc.). Flagger detects the change and starts the canary process.

Watch the progress:

```bash
kubectl describe canary my-app -n production
```

Or use Flagger's events:

```bash
kubectl get events -n production --field-selector involvedObject.name=my-app --sort-by=.lastTimestamp
```

## Custom Metrics

Beyond the built-in request-success-rate and request-duration metrics, you can define custom metrics from Prometheus:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  analysis:
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 30s
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 30s
    - name: error-rate
      templateRef:
        name: error-rate
        namespace: production
      thresholdRange:
        max: 1
      interval: 30s
---
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    100 - sum(
      rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload=~"{{ target }}-canary",
        response_code!~"5.*"
      }[{{ interval }}])
    ) / sum(
      rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload=~"{{ target }}-canary"
      }[{{ interval }}])
    ) * 100
```

## Adding Webhooks for Testing

Flagger can call webhooks during the canary process. Use this to run integration tests, load tests, or notify external systems:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  analysis:
    webhooks:
    - name: load-test
      type: rollout
      url: http://flagger-loadtester.production/
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.production/"
    - name: acceptance-test
      type: pre-rollout
      url: http://flagger-loadtester.production/
      metadata:
        type: bash
        cmd: "curl -s http://my-app-canary.production/healthz | grep ok"
```

Install the load tester:

```bash
helm install flagger-loadtester flagger/loadtester \
  --namespace production
```

## Monitoring the Canary

Flagger exposes Prometheus metrics:

```promql
# Canary status (0=initializing, 1=progressing, 2=succeeded, 3=failed)
flagger_canary_status{name="my-app", namespace="production"}

# Canary weight (current traffic percentage to canary)
flagger_canary_weight{name="my-app", namespace="production"}

# Total canary iterations
flagger_canary_total{name="my-app", namespace="production"}
```

Set up alerts for failed canaries:

```yaml
groups:
- name: flagger
  rules:
  - alert: CanaryFailed
    expr: flagger_canary_status{status="failed"} == 1
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Canary deployment failed for {{ $labels.name }}"
```

Flagger with Istio gives you automated, metric-driven canary deployments. Once configured, every deployment goes through a safe progressive rollout. Bad releases get caught automatically before they reach all your users.
