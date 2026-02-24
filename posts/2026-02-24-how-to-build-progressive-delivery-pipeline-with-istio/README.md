# How to Build Progressive Delivery Pipeline with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Progressive Delivery, Canary, Flagger, Kubernetes

Description: Implement automated progressive delivery with Istio using canary releases, blue-green deployments, and automated rollback based on metrics.

---

Progressive delivery is about gradually exposing new versions of your service to production traffic while monitoring for problems. If something goes wrong, you roll back automatically before most users are affected. Istio's traffic management makes this possible at the infrastructure level, and tools like Flagger can automate the entire process. Here's how to set it up.

## Progressive Delivery Strategies

There are several strategies you can use, each with different trade-offs:

| Strategy | How It Works | Best For |
|---|---|---|
| Canary | Gradually shift % of traffic to new version | Most services |
| Blue-Green | Switch all traffic at once between two versions | Stateful services, databases |
| A/B Testing | Route specific user segments to new version | Feature testing |
| Traffic Mirroring | Copy traffic to new version without affecting users | High-risk changes |

We'll focus on canary releases since they're the most common, but I'll cover the others too.

## Manual Canary with Istio

Before automating, understand how to do a canary manually:

### Deploy the Canary

```yaml
# Stable deployment (already running)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: stable
  template:
    metadata:
      labels:
        app: my-app
        version: stable
    spec:
      containers:
      - name: my-app
        image: my-app:v1.0
        ports:
        - containerPort: 8080

---
# Canary deployment (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      version: canary
  template:
    metadata:
      labels:
        app: my-app
        version: canary
    spec:
      containers:
      - name: my-app
        image: my-app:v1.1
        ports:
        - containerPort: 8080
```

### Create the Traffic Split

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary

---
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
        subset: stable
      weight: 95
    - destination:
        host: my-app
        subset: canary
      weight: 5
```

### Monitor and Adjust

Check metrics for the canary vs stable version:

```bash
# Compare error rates
# Stable:
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=sum(rate(istio_requests_total{destination_workload="my-app",response_code=~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_workload="my-app"}[5m]))'

# Canary:
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=sum(rate(istio_requests_total{destination_workload="my-app-canary",response_code=~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_workload="my-app-canary"}[5m]))'
```

Gradually increase the canary weight: 5% -> 10% -> 25% -> 50% -> 100%.

## Automated Canary with Flagger

Flagger is a progressive delivery tool that automates the canary process with Istio. It watches your deployments, creates canary versions automatically, shifts traffic based on metrics, and rolls back on failure.

### Install Flagger

```bash
# Add the Flagger Helm repo
helm repo add flagger https://flagger.app

# Install Flagger with Istio as the mesh provider
helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus.monitoring:9090
```

### Configure a Canary Resource

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
    targetPort: 8080
    gateways:
    - mesh
  analysis:
    # How often to run the analysis
    interval: 1m
    # Maximum number of failed analysis before rollback
    threshold: 5
    # Maximum traffic weight for canary
    maxWeight: 50
    # Traffic increment per step
    stepWeight: 10
    metrics:
    # Success rate must be > 99%
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    # P99 latency must be < 500ms
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    # Custom metric check
    webhooks:
    - name: load-test
      type: rollout
      url: http://loadtester.production/
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.production:8080/"
```

When you update the deployment image, Flagger automatically:

1. Detects the change
2. Creates a canary deployment
3. Starts shifting traffic: 0% -> 10% -> 20% -> 30% -> 40% -> 50%
4. At each step, checks the success rate and latency
5. If metrics are good, continues to the next step
6. If metrics fail 5 times, rolls back to the stable version
7. Once at max weight with good metrics, promotes the canary to stable

### Watch the Rollout

```bash
# Watch Flagger events
kubectl describe canary my-app -n production

# Check the canary status
kubectl get canary -n production

# Watch in real-time
kubectl -n production get canary my-app -w

# Sample output:
# NAME     STATUS        WEIGHT   LASTTRANSITIONTIME
# my-app   Progressing   10       2026-02-24T10:00:00Z
# my-app   Progressing   20       2026-02-24T10:01:00Z
# my-app   Progressing   30       2026-02-24T10:02:00Z
# ...
# my-app   Succeeded     0        2026-02-24T10:05:00Z
```

## Blue-Green Deployments

For services where canary isn't appropriate (like when you need to switch all at once), use blue-green:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-stateful-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-stateful-app
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 3
    iterations: 10  # Run analysis 10 times before promoting
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    webhooks:
    - name: smoke-test
      type: pre-rollout
      url: http://loadtester.production/
      metadata:
        cmd: "curl -s http://my-stateful-app-canary.production:8080/health"
```

With `iterations` instead of `maxWeight`/`stepWeight`, Flagger uses blue-green strategy. It deploys the new version, runs tests against it, and then switches all traffic at once.

## Traffic Mirroring

For high-risk changes, mirror production traffic to the new version without affecting real users:

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
        subset: stable
      weight: 100
    mirror:
      host: my-app
      subset: canary
    mirrorPercentage:
      value: 100.0
```

The canary receives a copy of all traffic, but its responses are discarded. You can observe the canary's error rates and latency without any risk to production users.

```bash
# Monitor the mirrored canary
# Look for errors in canary logs
kubectl logs -l version=canary -c istio-proxy -n production --tail=20

# Compare canary metrics with stable
# If canary looks good, proceed with a real canary or blue-green deployment
```

## A/B Testing

Route specific users to the new version based on headers or cookies:

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
  # Beta users get the canary
  - match:
    - headers:
        x-user-group:
          exact: "beta"
    route:
    - destination:
        host: my-app
        subset: canary
  # Internal users get the canary
  - match:
    - headers:
        x-internal:
          exact: "true"
    route:
    - destination:
        host: my-app
        subset: canary
  # Everyone else gets stable
  - route:
    - destination:
        host: my-app
        subset: stable
```

This is useful when you want to test a new feature with a specific user segment before rolling it out to everyone.

## Custom Metrics for Flagger

The built-in metrics (success rate and latency) cover most cases, but you can add custom metrics:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate-by-route
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(istio_requests_total{
      destination_workload_namespace="{{ namespace }}",
      destination_workload="{{ target }}",
      response_code=~"5.*"
    }[{{ interval }}]))
    /
    sum(rate(istio_requests_total{
      destination_workload_namespace="{{ namespace }}",
      destination_workload="{{ target }}"
    }[{{ interval }}]))
```

Reference it in your Canary:

```yaml
analysis:
  metrics:
  - name: error-rate-by-route
    templateRef:
      name: error-rate-by-route
    thresholdRange:
      max: 0.01
    interval: 1m
```

## Monitoring Your Delivery Pipeline

Track these metrics for your progressive delivery process:

```bash
# Flagger metrics (exposed by Flagger itself)
# flagger_canary_status - Current canary status
# flagger_canary_weight - Current traffic weight
# flagger_canary_total - Total number of canary releases
# flagger_canary_duration_seconds - Duration of canary releases
```

Create a Grafana dashboard showing:
- Active canary deployments
- Canary success vs failure rate
- Average time to promote
- Rollback frequency

Progressive delivery dramatically reduces the risk of deployments. Instead of hoping your staging tests caught everything, you validate against real production traffic with automatic safeguards. With Istio handling the traffic management and Flagger automating the process, you get safe deployments without manual babysitting.
