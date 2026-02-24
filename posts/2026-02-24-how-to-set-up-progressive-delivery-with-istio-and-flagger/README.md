# How to Set Up Progressive Delivery with Istio and Flagger

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Flagger, Progressive Delivery, Kubernetes, Canary, Service Mesh

Description: How to set up automated progressive delivery using Flagger with Istio for canary deployments, automated traffic shifting, metric analysis, and rollback.

---

Progressive delivery automates what you would otherwise do manually with canary deployments: deploy a new version, gradually shift traffic, check metrics, and promote or rollback. Flagger is a Kubernetes operator built specifically for this purpose, and it works natively with Istio.

Instead of writing scripts to update VirtualService weights and query Prometheus, Flagger handles all of it. You just update your Deployment image, and Flagger orchestrates the entire rollout.

## How Flagger Works with Istio

When you create a Flagger Canary resource, Flagger takes over traffic management for that service. It creates:

1. A primary Deployment (the stable version)
2. A canary Deployment (the new version)
3. ClusterIP Services for both
4. A VirtualService that controls the traffic split
5. A DestinationRule with primary and canary subsets

You only manage the original Deployment. Flagger manages everything else.

## Installing Flagger

Install Flagger with Helm:

```bash
helm repo add flagger https://flagger.app
helm repo update

helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus.monitoring:9090
```

The `meshProvider=istio` tells Flagger to use Istio VirtualServices for traffic management. The `metricsServer` points to your Prometheus instance where Istio metrics are stored.

## Setting Up Your Application

Start with a standard Deployment and Service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: app
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
    spec:
      containers:
        - name: my-app
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: app
spec:
  selector:
    app: my-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

## Creating the Canary Resource

The Canary resource tells Flagger how to manage the progressive rollout:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: app
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
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.app:80/"
```

Key configuration:

- `interval: 30s` - Flagger checks metrics every 30 seconds
- `threshold: 5` - If 5 consecutive checks fail, Flagger rolls back
- `maxWeight: 50` - Maximum canary traffic is 50%
- `stepWeight: 10` - Increase canary traffic by 10% each step
- `request-success-rate min: 99` - At least 99% of requests must succeed
- `request-duration max: 500` - P99 latency must be under 500ms

## The Rollout Process

After applying the Canary resource, Flagger initializes. It creates the primary and canary Deployments and sets up the VirtualService. At this point, 100% of traffic goes to the primary.

To trigger a rollout, update the Deployment image:

```bash
kubectl set image deployment/my-app my-app=my-app:1.1.0 -n app
```

Flagger detects the change and starts the canary process:

```
1. Scales up canary with new image
2. Routes 10% traffic to canary (stepWeight)
3. Waits 30s (interval), checks metrics
4. If metrics pass, routes 20% to canary
5. Waits 30s, checks metrics
6. Routes 30% to canary
7. Waits 30s, checks metrics
8. Routes 40% to canary
9. Waits 30s, checks metrics
10. Routes 50% to canary (maxWeight)
11. Waits 30s, checks metrics
12. Promotes: copies canary to primary
13. Routes 100% to primary
14. Scales down canary
```

Monitor the progress:

```bash
kubectl describe canary my-app -n app
```

Or watch the events:

```bash
kubectl get events -n app --field-selector involvedObject.name=my-app --watch
```

## Custom Metrics

Besides the built-in metrics, you can define custom Prometheus queries:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: app
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    100 - sum(
      rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="app",
        destination_workload=~"my-app",
        response_code!~"5.*"
      }[{{ interval }}])
    ) / sum(
      rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="app",
        destination_workload=~"my-app"
      }[{{ interval }}])
    ) * 100
```

Reference it in the Canary:

```yaml
spec:
  analysis:
    metrics:
      - name: error-rate
        templateRef:
          name: error-rate
        thresholdRange:
          max: 1
        interval: 1m
```

## Load Testing During Canary

Flagger can run load tests during the canary to ensure there is enough traffic for meaningful metrics. Install the Flagger load tester:

```bash
helm install flagger-loadtester flagger/loadtester \
  --namespace test \
  --set meshProvider=istio
```

Configure it in the Canary webhooks:

```yaml
webhooks:
  - name: load-test
    type: rollout
    url: http://flagger-loadtester.test/
    timeout: 15s
    metadata:
      cmd: "hey -z 2m -q 10 -c 5 http://my-app-canary.app:80/api/health"
```

## Webhook Notifications

Get notified about rollout progress:

```yaml
webhooks:
  - name: slack-notification
    type: event
    url: http://flagger-loadtester.test/
    metadata:
      cmd: |
        curl -s -X POST $SLACK_WEBHOOK_URL \
          -H 'Content-Type: application/json' \
          -d '{"text":"Canary {{.Name}} in {{.Namespace}}: {{.Phase}}"}'
```

Or use Flagger's built-in alerting:

```yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack
  namespace: app
spec:
  type: slack
  channel: deployments
  address: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## CI/CD Integration

In your CI pipeline, the deployment step is simple - just update the image:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push
        run: |
          docker build -t my-app:${{ github.sha }} .
          docker push my-app:${{ github.sha }}

      - name: Trigger canary rollout
        run: |
          kubectl set image deployment/my-app \
            my-app=my-app:${{ github.sha }} -n app

      - name: Wait for rollout
        run: |
          kubectl wait canary/my-app -n app \
            --for=condition=promoted --timeout=600s
```

The `kubectl wait` command blocks until Flagger finishes the rollout (either promotion or rollback).

## Handling Rollback

If metrics fail during the canary, Flagger automatically rolls back. You can see the status:

```bash
kubectl get canary my-app -n app
```

Output:

```
NAME     STATUS    WEIGHT   LASTTRANSITIONTIME
my-app   Failed    0        2024-01-15T10:30:00Z
```

In CI, handle the failure:

```yaml
- name: Wait for rollout
  id: rollout
  continue-on-error: true
  run: |
    kubectl wait canary/my-app -n app \
      --for=condition=promoted --timeout=600s

- name: Check result
  run: |
    STATUS=$(kubectl get canary my-app -n app -o jsonpath='{.status.phase}')
    if [ "$STATUS" = "Failed" ]; then
      echo "Canary rollout failed and was rolled back"
      exit 1
    fi
```

## Configuring the Rollout Strategy

For different rollout speeds:

```yaml
# Fast rollout (for staging)
analysis:
  interval: 15s
  threshold: 3
  maxWeight: 80
  stepWeight: 20

# Slow rollout (for production)
analysis:
  interval: 60s
  threshold: 10
  maxWeight: 50
  stepWeight: 5
```

The staging configuration reaches 80% canary in about 1 minute. The production configuration takes over 10 minutes to reach 50%.

## Monitoring Flagger

Flagger exposes its own metrics:

```
flagger_canary_status{name="my-app", namespace="app"}
flagger_canary_weight{name="my-app", namespace="app"}
flagger_canary_total{name="my-app", namespace="app"}
```

Set up Grafana dashboards to track rollout history, success rates, and duration.

Flagger with Istio turns progressive delivery into a fully automated process. You push a new image, and the system handles traffic shifting, metric analysis, and rollback decisions. The only manual step is the initial setup of the Canary resource and metric templates. After that, every deployment goes through the same safe, graduated rollout.
