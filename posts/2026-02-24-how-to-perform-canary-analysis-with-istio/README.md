# How to Perform Canary Analysis with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Canary Deployments, Traffic Management, Kubernetes, Progressive Delivery

Description: A step-by-step guide to performing canary deployments and automated canary analysis with Istio traffic splitting and metric-based promotion decisions.

---

Canary deployments let you roll out a new version of your service to a small percentage of traffic, verify it works correctly, and then gradually increase the percentage until the new version handles all traffic. Istio makes this straightforward with its weighted routing capabilities. But manually watching dashboards to decide whether to promote or roll back is tedious and error-prone.

This guide walks through setting up canary deployments with Istio, from basic manual traffic splitting to fully automated canary analysis.

## The Basic Canary Setup

Start with a stable v1 deployment and a canary v2 deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: v1
  template:
    metadata:
      labels:
        app: my-app
        version: v1
    spec:
      containers:
      - name: my-app
        image: my-app:1.0.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v2
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      version: v2
  template:
    metadata:
      labels:
        app: my-app
        version: v2
    spec:
      containers:
      - name: my-app
        image: my-app:2.0.0
        ports:
        - containerPort: 8080
```

Create the DestinationRule with subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Manual Canary with Weighted Routing

Start by sending 5% of traffic to the canary:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 95
    - destination:
        host: my-app
        subset: v2
      weight: 5
```

If metrics look good after some observation period, bump to 25%:

```yaml
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 75
    - destination:
        host: my-app
        subset: v2
      weight: 25
```

Continue increasing: 50%, 75%, 100%. At each step, check your key metrics.

## Key Metrics for Canary Analysis

The most important metrics to compare between the canary and the stable version are:

**Error rate** - Compare the 5xx rate between v1 and v2:

```text
# v1 error rate
sum(rate(istio_requests_total{destination_service="my-app.production.svc.cluster.local",destination_version="v1",response_code=~"5.*"}[5m]))
/
sum(rate(istio_requests_total{destination_service="my-app.production.svc.cluster.local",destination_version="v1"}[5m]))

# v2 error rate
sum(rate(istio_requests_total{destination_service="my-app.production.svc.cluster.local",destination_version="v2",response_code=~"5.*"}[5m]))
/
sum(rate(istio_requests_total{destination_service="my-app.production.svc.cluster.local",destination_version="v2"}[5m]))
```

**Latency** - Compare P99 latency:

```text
# v1 P99
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="my-app.production.svc.cluster.local",destination_version="v1"}[5m])) by (le))

# v2 P99
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="my-app.production.svc.cluster.local",destination_version="v2"}[5m])) by (le))
```

## Automated Canary with Flagger

Manually adjusting weights is not scalable. Flagger automates the entire canary process using Istio's traffic management.

Install Flagger:

```bash
helm repo add flagger https://flagger.app
helm upgrade -i flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus:9090
```

Create a Canary resource that defines the rollout strategy:

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
    port: 8080
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
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
```

This tells Flagger to:
- Start at 0% canary traffic
- Increase by 10% every minute
- Go up to 50% maximum
- Require a 99% success rate
- Require P99 latency under 500ms
- Roll back if 5 consecutive checks fail

## How Flagger Works with Istio

When you update the Deployment image, Flagger detects the change and starts the canary analysis:

```bash
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n production
```

Flagger then:

1. Creates a canary Deployment (my-app-primary stays at v1)
2. Creates a VirtualService with weighted routing
3. Gradually shifts traffic: 10%, 20%, 30%, 40%, 50%
4. At each step, queries Prometheus to check if the canary meets the thresholds
5. If all checks pass, promotes the canary to primary
6. If checks fail, rolls back to v1

Watch the progress:

```bash
kubectl describe canary my-app -n production
```

Or watch events:

```bash
kubectl get events -n production --field-selector involvedObject.name=my-app --watch
```

## Custom Canary Metrics

You can add custom application metrics to the analysis. First, register a MetricTemplate:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate-by-endpoint
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    100 - sum(
      rate(istio_requests_total{
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}",
        response_code!~"5.*"
      }[{{ interval }}])
    )
    /
    sum(
      rate(istio_requests_total{
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}"
      }[{{ interval }}])
    ) * 100
```

Reference it in the Canary spec:

```yaml
spec:
  analysis:
    metrics:
    - name: error-rate-by-endpoint
      templateRef:
        name: error-rate-by-endpoint
      thresholdRange:
        max: 1
      interval: 1m
```

## Canary with Header-Based Testing

Before shifting real traffic, you can test the canary using header-based routing. Flagger supports this through its `match` configuration, but you can also do it manually:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-app
        subset: v2
  - route:
    - destination:
        host: my-app
        subset: v1
```

This lets your QA team test the canary by adding the header, while all other traffic stays on v1. Once manual testing passes, switch to weighted routing.

## Rolling Back a Failed Canary

If the canary fails, you need to quickly shift all traffic back to v1:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 100
EOF
```

Then clean up the failed canary deployment:

```bash
kubectl delete deployment my-app-v2 -n production
```

With Flagger, rollback happens automatically when metrics fail the threshold checks.

## Monitoring the Canary Analysis

Set up a Grafana dashboard that shows the canary and stable metrics side by side. Flagger comes with a Grafana dashboard that you can import:

```bash
kubectl port-forward -n istio-system svc/grafana 3000:3000
```

The dashboard shows request success rate, request duration, and the canary weight over time. This gives you full visibility into the automated promotion process.

## Wrapping Up

Canary deployments with Istio give you fine-grained control over how new versions are rolled out. Start with manual weighted routing to understand the mechanics, then move to automated analysis with Flagger. The key is choosing the right metrics and thresholds for your service. A canary that catches a bad deployment before it reaches 100% of traffic is worth all the setup effort.
