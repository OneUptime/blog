# How to Implement Canary Deployments Using Weighted Service Routing in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment Strategies, Traffic Management

Description: Learn how to implement canary deployment strategies in Kubernetes using replica counts and service mesh features to gradually roll out new versions with weighted traffic distribution.

---

Canary deployments reduce risk by gradually rolling out changes to a small subset of users before full deployment. Instead of switching all traffic at once, you route a percentage (like 10%) to the new version while monitoring metrics. If issues arise, you can quickly roll back. If metrics look good, you gradually increase traffic until the new version handles 100%.

Kubernetes supports canary patterns through replica manipulation and, more sophisticatedly, through service mesh weighted routing.

## Basic Canary with Replica Counts

The simplest approach uses replica ratios to control traffic distribution:

```yaml
# Stable version - 90% of traffic (9 replicas)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: web-app
      track: stable
  template:
    metadata:
      labels:
        app: web-app
        track: stable
        version: v1.0
    spec:
      containers:
      - name: app
        image: web-app:v1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
---
# Canary version - 10% of traffic (1 replica)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-app
      track: canary
  template:
    metadata:
      labels:
        app: web-app
        track: canary
        version: v2.0
    spec:
      containers:
      - name: app
        image: web-app:v2.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
---
# Service selects both stable and canary
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web-app  # Matches both stable and canary
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

Traffic distribution is approximately 90% stable, 10% canary based on replica ratio (9:1).

## Progressive Rollout Script

Automate gradual traffic increase:

```bash
#!/bin/bash
# canary-rollout.sh

set -e

APP_NAME="web-app"
NAMESPACE="production"
NEW_VERSION=$1
CANARY_STEPS=(10 25 50 75 100)  # Percentage of traffic

if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <new-version>"
    exit 1
fi

# Update canary deployment
echo "Deploying canary version $NEW_VERSION..."
kubectl set image deployment/${APP_NAME}-canary \
    app=${APP_NAME}:${NEW_VERSION} \
    -n $NAMESPACE

kubectl rollout status deployment/${APP_NAME}-canary -n $NAMESPACE

# Get current stable replica count
TOTAL_REPLICAS=$(kubectl get deployment ${APP_NAME}-stable -n $NAMESPACE \
    -o jsonpath='{.spec.replicas}')

for PERCENT in "${CANARY_STEPS[@]}"; do
    echo ""
    echo "=== Increasing canary traffic to ${PERCENT}% ==="

    CANARY_REPLICAS=$(( TOTAL_REPLICAS * PERCENT / 100 ))
    STABLE_REPLICAS=$(( TOTAL_REPLICAS - CANARY_REPLICAS ))

    # Ensure at least 1 replica
    CANARY_REPLICAS=$(( CANARY_REPLICAS > 0 ? CANARY_REPLICAS : 1 ))
    STABLE_REPLICAS=$(( STABLE_REPLICAS > 0 ? STABLE_REPLICAS : 1 ))

    echo "Stable replicas: $STABLE_REPLICAS"
    echo "Canary replicas: $CANARY_REPLICAS"

    kubectl scale deployment/${APP_NAME}-stable --replicas=$STABLE_REPLICAS -n $NAMESPACE
    kubectl scale deployment/${APP_NAME}-canary --replicas=$CANARY_REPLICAS -n $NAMESPACE

    # Wait for scaling to complete
    kubectl rollout status deployment/${APP_NAME}-stable -n $NAMESPACE
    kubectl rollout status deployment/${APP_NAME}-canary -n $NAMESPACE

    # Monitor metrics
    echo "Monitoring for 5 minutes..."
    sleep 300

    # Check error rate (implement your own check)
    ERROR_RATE=$(check_error_rate ${APP_NAME} ${NAMESPACE})
    if [ "$ERROR_RATE" -gt 5 ]; then
        echo "ERROR: High error rate detected! Rolling back..."
        kubectl scale deployment/${APP_NAME}-canary --replicas=0 -n $NAMESPACE
        kubectl scale deployment/${APP_NAME}-stable --replicas=$TOTAL_REPLICAS -n $NAMESPACE
        exit 1
    fi

    echo "Metrics look good, proceeding..."
done

echo ""
echo "=== Canary rollout complete ==="
echo "Promoting canary to stable..."

# Update stable deployment to new version
kubectl set image deployment/${APP_NAME}-stable \
    app=${APP_NAME}:${NEW_VERSION} \
    -n $NAMESPACE

kubectl rollout status deployment/${APP_NAME}-stable -n $NAMESPACE

# Scale down canary
kubectl scale deployment/${APP_NAME}-canary --replicas=0 -n $NAMESPACE

echo "Deployment complete!"
```

## Istio-Based Weighted Routing

For precise traffic control, use a service mesh like Istio:

```yaml
# Stable deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-stable
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
      version: stable
  template:
    metadata:
      labels:
        app: api
        version: stable
    spec:
      containers:
      - name: api
        image: api:v1.0
---
# Canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-canary
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
      version: canary
  template:
    metadata:
      labels:
        app: api
        version: canary
    spec:
      containers:
      - name: api
        image: api:v2.0
---
# Kubernetes service
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
---
# Istio VirtualService for traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
  - api
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api
        subset: canary
      weight: 100
  - route:
    - destination:
        host: api
        subset: stable
      weight: 90
    - destination:
        host: api
        subset: canary
      weight: 10
---
# Istio DestinationRule
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api
spec:
  host: api
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

Update traffic weights:

```bash
# Increase canary to 25%
kubectl patch virtualservice api --type=json -p='[
  {
    "op": "replace",
    "path": "/spec/http/1/route/0/weight",
    "value": 75
  },
  {
    "op": "replace",
    "path": "/spec/http/1/route/1/weight",
    "value": 25
  }
]'
```

## Metrics-Based Canary with Prometheus

Automate decisions based on metrics:

```python
#!/usr/bin/env python3
import requests
import time
from kubernetes import client, config

config.load_kube_config()
apps_v1 = client.AppsV1Api()

PROMETHEUS_URL = "http://prometheus:9090"
NAMESPACE = "production"
APP = "api"

def query_prometheus(query):
    """Query Prometheus metrics."""
    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )
    return response.json()

def get_error_rate(version):
    """Get error rate for a specific version."""
    query = f'''
    rate(http_requests_total{{
        app="{APP}",
        version="{version}",
        status=~"5.."
    }}[5m])
    /
    rate(http_requests_total{{
        app="{APP}",
        version="{version}"
    }}[5m])
    '''
    result = query_prometheus(query)
    if result['data']['result']:
        return float(result['data']['result'][0]['value'][1])
    return 0.0

def get_latency_p99(version):
    """Get p99 latency for a version."""
    query = f'''
    histogram_quantile(0.99,
      rate(http_request_duration_seconds_bucket{{
        app="{APP}",
        version="{version}"
      }}[5m])
    )
    '''
    result = query_prometheus(query)
    if result['data']['result']:
        return float(result['data']['result'][0]['value'][1])
    return 0.0

def scale_deployment(deployment, replicas):
    """Scale a deployment."""
    apps_v1.patch_namespaced_deployment_scale(
        deployment, NAMESPACE,
        {"spec": {"replicas": replicas}}
    )

def canary_rollout(total_replicas=10):
    """Perform automated canary rollout."""
    stages = [
        (10, 300),   # 10% for 5 minutes
        (25, 600),   # 25% for 10 minutes
        (50, 600),   # 50% for 10 minutes
        (100, 0)     # 100%
    ]

    for canary_percent, wait_time in stages:
        canary_replicas = max(1, total_replicas * canary_percent // 100)
        stable_replicas = total_replicas - canary_replicas

        print(f"\n=== Canary: {canary_percent}% ({canary_replicas} replicas) ===")

        scale_deployment(f"{APP}-stable", stable_replicas)
        scale_deployment(f"{APP}-canary", canary_replicas)

        # Wait for rollout
        time.sleep(30)

        # Check metrics
        canary_error_rate = get_error_rate("canary")
        stable_error_rate = get_error_rate("stable")
        canary_latency = get_latency_p99("canary")
        stable_latency = get_latency_p99("stable")

        print(f"Canary error rate: {canary_error_rate:.4f}")
        print(f"Stable error rate: {stable_error_rate:.4f}")
        print(f"Canary p99 latency: {canary_latency:.3f}s")
        print(f"Stable p99 latency: {stable_latency:.3f}s")

        # Automated rollback conditions
        if canary_error_rate > stable_error_rate * 2:
            print("ERROR: Canary error rate too high! Rolling back...")
            scale_deployment(f"{APP}-canary", 0)
            scale_deployment(f"{APP}-stable", total_replicas)
            return False

        if canary_latency > stable_latency * 1.5:
            print("WARNING: Canary latency significantly higher! Rolling back...")
            scale_deployment(f"{APP}-canary", 0)
            scale_deployment(f"{APP}-stable", total_replicas)
            return False

        print(f"Metrics OK. Waiting {wait_time}s before next stage...")
        time.sleep(wait_time)

    print("\n=== Canary rollout successful! ===")
    return True

if __name__ == "__main__":
    success = canary_rollout()
    exit(0 if success else 1)
```

## Header-Based Routing for Testing

Allow specific users to test canary:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary-testing
spec:
  hosts:
  - api.example.com
  http:
  # Route beta testers to canary
  - match:
    - headers:
        x-user-group:
          exact: "beta-testers"
    route:
    - destination:
        host: api
        subset: canary
  # Route internal traffic to canary
  - match:
    - headers:
        x-internal:
          exact: "true"
    route:
    - destination:
        host: api
        subset: canary
  # Everyone else gets weighted distribution
  - route:
    - destination:
        host: api
        subset: stable
      weight: 95
    - destination:
        host: api
        subset: canary
      weight: 5
```

## Monitoring Canary Deployments

Create dashboards and alerts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: canary-alerts
data:
  alerts.yaml: |
    groups:
    - name: canary
      rules:
      - alert: CanaryHighErrorRate
        expr: |
          (
            rate(http_requests_total{version="canary",status=~"5.."}[5m])
            /
            rate(http_requests_total{version="canary"}[5m])
          )
          >
          (
            rate(http_requests_total{version="stable",status=~"5.."}[5m])
            /
            rate(http_requests_total{version="stable"}[5m])
          ) * 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Canary version has 2x error rate of stable"

      - alert: CanaryHighLatency
        expr: |
          histogram_quantile(0.99,
            rate(http_request_duration_seconds_bucket{version="canary"}[5m])
          )
          >
          histogram_quantile(0.99,
            rate(http_request_duration_seconds_bucket{version="stable"}[5m])
          ) * 1.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Canary p99 latency 50% higher than stable"
```

## Best Practices

Start with small percentages (5-10%). Minimize blast radius if issues occur.

Monitor business metrics, not just technical ones. Track conversion rates, checkout success, etc.

Use automated rollback based on metrics. Don't rely only on manual monitoring.

Define clear success criteria before starting. Know what metrics indicate a successful canary.

Run canary for sufficient time at each stage. Give enough data to make confident decisions.

Test with real production traffic. Synthetic tests don't reveal all issues.

Combine with feature flags for extra control. Allow instant disable of new features independently of deployment.

Keep canary deployments small resource-wise. Running 1 canary pod is enough for initial testing.

Document rollback procedures. Ensure team knows how to abort a canary deployment.

Consider user session affinity. Some applications require users to stick to one version throughout their session.

Canary deployments provide a safer alternative to rolling updates by allowing you to validate changes with real production traffic before full rollout, significantly reducing the risk of widespread issues from bad releases.
