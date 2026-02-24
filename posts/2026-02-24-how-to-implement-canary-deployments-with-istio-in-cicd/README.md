# How to Implement Canary Deployments with Istio in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Canary Deployment, CI/CD, Kubernetes, Traffic Management

Description: How to implement canary deployments using Istio traffic splitting in CI/CD pipelines with gradual rollout, metric-based promotion, and automated rollback.

---

Canary deployments let you release a new version to a small percentage of users before rolling it out to everyone. Istio makes this straightforward with its traffic splitting capabilities in VirtualServices. When you combine this with CI/CD automation, you get a deployment process that gradually shifts traffic, monitors for errors, and automatically rolls back if something goes wrong.

This post walks through building a canary deployment pipeline from scratch using Istio.

## The Setup

You need two versions of your application running simultaneously - the current stable version and the new canary version. Istio routes a percentage of traffic to each. The key Kubernetes resources are:

```yaml
# Stable deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
  namespace: app
  labels:
    app: my-app
    version: stable
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
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
---
# Canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
  namespace: app
  labels:
    app: my-app
    version: canary
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
          image: my-app:1.1.0
          ports:
            - containerPort: 8080
```

A single Service selects both versions:

```yaml
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

## DestinationRule with Subsets

Define subsets in a DestinationRule that match the version labels:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
  namespace: app
spec:
  host: my-app.app.svc.cluster.local
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
```

## VirtualService for Traffic Splitting

The VirtualService controls the traffic split:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: app
spec:
  hosts:
    - my-app.app.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-app.app.svc.cluster.local
            subset: stable
          weight: 100
        - destination:
            host: my-app.app.svc.cluster.local
            subset: canary
          weight: 0
```

Starting at 0% canary, you gradually increase the canary weight.

## The CI/CD Pipeline

Here is a GitHub Actions workflow that implements the full canary process:

```yaml
name: Canary Deployment
on:
  push:
    branches: [main]

jobs:
  canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push image
        run: |
          docker build -t my-app:${{ github.sha }} .
          docker push my-app:${{ github.sha }}

      - name: Deploy canary
        run: |
          kubectl set image deployment/my-app-canary \
            my-app=my-app:${{ github.sha }} -n app
          kubectl rollout status deployment/my-app-canary -n app --timeout=120s

      - name: Route 10% to canary
        run: |
          cat <<EOF | kubectl apply -f -
          apiVersion: networking.istio.io/v1
          kind: VirtualService
          metadata:
            name: my-app
            namespace: app
          spec:
            hosts:
              - my-app.app.svc.cluster.local
            http:
              - route:
                  - destination:
                      host: my-app.app.svc.cluster.local
                      subset: stable
                    weight: 90
                  - destination:
                      host: my-app.app.svc.cluster.local
                      subset: canary
                    weight: 10
          EOF

      - name: Monitor canary (10%)
        run: |
          sleep 120
          ./scripts/check-canary-metrics.sh

      - name: Route 50% to canary
        run: |
          kubectl patch virtualservice my-app -n app --type=merge -p '
            {"spec":{"http":[{"route":[
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"stable"},"weight":50},
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"canary"},"weight":50}
            ]}]}}'

      - name: Monitor canary (50%)
        run: |
          sleep 120
          ./scripts/check-canary-metrics.sh

      - name: Promote to stable
        run: |
          kubectl set image deployment/my-app-stable \
            my-app=my-app:${{ github.sha }} -n app
          kubectl rollout status deployment/my-app-stable -n app --timeout=300s

          kubectl patch virtualservice my-app -n app --type=merge -p '
            {"spec":{"http":[{"route":[
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"stable"},"weight":100},
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"canary"},"weight":0}
            ]}]}}'
```

## The Metrics Check Script

The `check-canary-metrics.sh` script queries Prometheus for error rates and latency:

```bash
#!/bin/bash
set -e

PROMETHEUS_URL="http://prometheus.monitoring.svc.cluster.local:9090"

# Check canary error rate
ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"my-app-canary\",response_code=~\"5..\"}[5m])) / sum(rate(istio_requests_total{destination_workload=\"my-app-canary\"}[5m])) * 100" \
  | jq -r '.data.result[0].value[1] // "0"')

echo "Canary error rate: ${ERROR_RATE}%"

# Check canary p99 latency
P99_LATENCY=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode "query=histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_workload=\"my-app-canary\"}[5m])) by (le))" \
  | jq -r '.data.result[0].value[1] // "0"')

echo "Canary p99 latency: ${P99_LATENCY}ms"

# Fail if error rate > 1% or p99 > 500ms
if (( $(echo "$ERROR_RATE > 1" | bc -l) )); then
  echo "Error rate too high, failing canary"
  exit 1
fi

if (( $(echo "$P99_LATENCY > 500" | bc -l) )); then
  echo "Latency too high, failing canary"
  exit 1
fi

echo "Canary metrics look good"
```

## Automated Rollback

If any step fails, roll back the canary:

```yaml
      - name: Rollback canary
        if: failure()
        run: |
          # Send all traffic back to stable
          kubectl patch virtualservice my-app -n app --type=merge -p '
            {"spec":{"http":[{"route":[
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"stable"},"weight":100},
              {"destination":{"host":"my-app.app.svc.cluster.local","subset":"canary"},"weight":0}
            ]}]}}'

          # Scale down canary
          kubectl scale deployment/my-app-canary -n app --replicas=0

          echo "Canary rolled back successfully"
```

## Header-Based Canary Routing

For internal testing before exposing the canary to real users, route based on a header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: app
spec:
  hosts:
    - my-app.app.svc.cluster.local
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-app.app.svc.cluster.local
            subset: canary
    - route:
        - destination:
            host: my-app.app.svc.cluster.local
            subset: stable
```

Your QA team can test the canary by adding the `x-canary: true` header, while all other traffic goes to stable.

## Multi-Step Weight Progression

For a more gradual rollout, use more steps:

```bash
WEIGHTS=(5 10 25 50 75 100)

for weight in "${WEIGHTS[@]}"; do
  stable_weight=$((100 - weight))

  kubectl patch virtualservice my-app -n app --type=merge -p "
    {\"spec\":{\"http\":[{\"route\":[
      {\"destination\":{\"host\":\"my-app.app.svc.cluster.local\",\"subset\":\"stable\"},\"weight\":$stable_weight},
      {\"destination\":{\"host\":\"my-app.app.svc.cluster.local\",\"subset\":\"canary\"},\"weight\":$weight}
    ]}]}}"

  echo "Canary at ${weight}%, waiting 2 minutes..."
  sleep 120

  ./scripts/check-canary-metrics.sh || {
    echo "Canary failed at ${weight}%, rolling back"
    # rollback logic here
    exit 1
  }
done
```

This goes from 5% to 100% in six steps, checking metrics at each step.

## Cleaning Up After Promotion

After the canary is promoted and stable is updated, clean up the canary deployment. Either scale it to zero or delete it:

```yaml
- name: Clean up canary
  run: |
    kubectl scale deployment/my-app-canary -n app --replicas=0
```

Keep the canary deployment definition around so the next release can use it.

Canary deployments with Istio give you fine-grained control over how new versions are rolled out. The traffic splitting happens at the mesh level, which means it works regardless of how many replicas each version has. Combined with automated metric checks in CI/CD, you get a deployment process that catches problems before they affect most users.
