# How to Use HAProxy Ingress Controller with Blue-Green Deployment Annotations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HAProxy, Deployment

Description: Learn how to implement blue-green deployments using HAProxy Ingress Controller annotations for zero-downtime releases, traffic switching, and safe production rollouts in Kubernetes environments.

---

Blue-green deployments provide zero-downtime releases by maintaining two identical production environments. HAProxy Ingress supports blue-green deployments through annotations that control traffic routing between versions. This guide explores how to implement blue-green deployments using HAProxy Ingress's powerful annotation system.

## Understanding Blue-Green Deployments

Blue-green deployments work by:
- Running two identical production environments (blue and green)
- Routing all production traffic to one environment (active)
- Deploying new versions to the inactive environment
- Testing the new version thoroughly
- Switching traffic to the new version instantly
- Keeping the old version running for quick rollback

HAProxy Ingress enables this pattern through weight-based routing and annotation-based configuration.

## Installing HAProxy Ingress Controller

Install HAProxy Ingress Controller:

```bash
# Using Helm

helm repo add haproxy-ingress https://haproxy-ingress.github.io/charts
helm repo update

helm upgrade haproxy-ingress haproxy-ingress/haproxy-ingress \
  --install \
  --namespace ingress-controller \
  --create-namespace \
  --version 0.16.1 \
  --set controller.ingressClassResource.enabled=true
```

Verify installation:

```bash
kubectl get pods -n ingress-controller
kubectl get svc -n ingress-controller
```

## Basic Blue-Green Setup

Create two deployments representing blue and green environments, and expose them through one Service that selects both sets of pods. HAProxy Ingress uses the shared service selector for the backend and a second label to distinguish the blue and green groups. You can also keep version-specific Services for path-based preview routes.

### Blue and Green Deployments

```yaml
# blue-green-deployments.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
  namespace: default
  labels:
    app: myapp
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
        env:
        - name: VERSION
          value: "blue-v1.0"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
  namespace: default
  labels:
    app: myapp
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: app
        image: myapp:v2.0
        ports:
        - containerPort: 8080
        env:
        - name: VERSION
          value: "green-v2.0"
---
apiVersion: v1
kind: Service
metadata:
  name: app-service
  namespace: default
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: app-blue
  namespace: default
spec:
  selector:
    app: myapp
    version: blue
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: app-green
  namespace: default
spec:
  selector:
    app: myapp
    version: green
  ports:
  - port: 80
    targetPort: 8080
```

### Traffic Routing with Weights

Use HAProxy Ingress annotations to control traffic distribution:

```yaml
# blue-green-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: default
  annotations:
    # HAProxy backend configuration
    haproxy-ingress.github.io/balance-algorithm: "roundrobin"

    # Blue receives all new traffic initially; green receives none.
    haproxy-ingress.github.io/blue-green-balance: "version=blue=100,version=green=0"
    haproxy-ingress.github.io/blue-green-mode: "deploy"

    # Health check configuration
    haproxy-ingress.github.io/health-check-uri: "/health"
    haproxy-ingress.github.io/health-check-interval: "10s"
spec:
  ingressClassName: haproxy
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Gradual Traffic Shifting

Implement canary-style gradual shifting between blue and green.

### Multi-Backend Ingress

Configure both groups with weights:

```yaml
# weighted-blue-green.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: weighted-app
  namespace: default
  annotations:
    haproxy-ingress.github.io/balance-algorithm: "roundrobin"

    # Send 80% of new traffic to blue and 20% to green.
    haproxy-ingress.github.io/blue-green-balance: "version=blue=80,version=green=20"
    haproxy-ingress.github.io/blue-green-mode: "deploy"

    # Server check configuration
    haproxy-ingress.github.io/health-check-uri: "/health"
    haproxy-ingress.github.io/health-check-interval: "5s"

    # Connection timeouts
    haproxy-ingress.github.io/timeout-connect: "5s"
    haproxy-ingress.github.io/timeout-server: "30s"
spec:
  ingressClassName: haproxy
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

For more precise control, update the `blue-green-balance` annotation:

```yaml
metadata:
  annotations:
    haproxy-ingress.github.io/blue-green-balance: "version=blue=70,version=green=30"
    haproxy-ingress.github.io/blue-green-mode: "deploy"
```

### Dynamic Weight Adjustment

Script for gradual traffic shift:

```bash
#!/bin/bash
# shift-traffic.sh

NAMESPACE="default"
INGRESS="app-ingress"

# Shift traffic gradually from blue to green
for weight in 0 20 40 60 80 100; do
  blue_weight=$((100 - weight))
  green_weight=$weight

  echo "Shifting traffic: Blue $blue_weight%, Green $green_weight%"

  kubectl annotate ingress "$INGRESS" \
    -n "$NAMESPACE" \
    haproxy-ingress.github.io/blue-green-balance="version=blue=$blue_weight,version=green=$green_weight" \
    haproxy-ingress.github.io/blue-green-mode="deploy" \
    --overwrite

  # Wait for health checks and monitoring
  sleep 60

  # Check error rates (pseudo-code)
  # If error rate increases, rollback
done

echo "Traffic shift complete - 100% on green"
```

## Advanced Blue-Green Patterns

Implement sophisticated routing strategies.

### Header-Based Routing

Route beta users to green environment:

```yaml
# header-routing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: header-based-routing
  namespace: default
  annotations:
    # Match the value of X-Beta-Version against the pod's version label.
    haproxy-ingress.github.io/blue-green-header: "X-Beta-Version:version"
    haproxy-ingress.github.io/blue-green-balance: "version=blue=100,version=green=0"
    haproxy-ingress.github.io/blue-green-mode: "deploy"
spec:
  ingressClassName: haproxy
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

Requests with `X-Beta-Version: green` go to green pods. Requests without the header, or with a value that does not match a `version` label, fall back to the configured balance.

### Path-Based Blue-Green

Different paths to different versions:

```yaml
# path-blue-green.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-routing
  namespace: default
spec:
  ingressClassName: haproxy
  rules:
  - host: app.example.com
    http:
      paths:
      # Production on blue
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-blue
            port:
              number: 80

      # Preview on green
      - path: /preview
        pathType: Prefix
        backend:
          service:
            name: app-green
            port:
              number: 80
```

### Cookie-Based Routing

Route users based on a version cookie during rollout:

```yaml
# cookie-routing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cookie-routing
  namespace: default
  annotations:
    # Match the version cookie value against the pod's version label.
    haproxy-ingress.github.io/blue-green-cookie: "version:version"
    haproxy-ingress.github.io/blue-green-balance: "version=blue=100,version=green=0"
    haproxy-ingress.github.io/blue-green-mode: "deploy"
spec:
  ingressClassName: haproxy
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Health Checks and Safety

Implement health checks for safe deployments.

### Advanced Health Checks

```yaml
# health-check-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: health-checked-blue-green
  namespace: default
  annotations:
    # Enable HTTP health checks
    haproxy-ingress.github.io/health-check-uri: "/health"
    haproxy-ingress.github.io/health-check-interval: "5s"

    # Rise and fall thresholds
    haproxy-ingress.github.io/health-check-rise-count: "2"
    haproxy-ingress.github.io/health-check-fall-count: "3"

    # Blue-green balance
    haproxy-ingress.github.io/blue-green-balance: "version=blue=100,version=green=0"
    haproxy-ingress.github.io/blue-green-mode: "deploy"
spec:
  ingressClassName: haproxy
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

### Rollback Command

Roll back traffic to blue by restoring the blue-green balance:

```bash
kubectl annotate ingress app-ingress \
  -n default \
  haproxy-ingress.github.io/blue-green-balance="version=blue=100,version=green=0" \
  haproxy-ingress.github.io/blue-green-mode="deploy" \
  --overwrite
```

## Monitoring Blue-Green Deployments

Monitor traffic distribution and health.

### Traffic Distribution Metrics

Enable HAProxy Ingress metrics in the Helm values:

```yaml
# haproxy-ingress-values.yaml
controller:
  ingressClassResource:
    enabled: true
  stats:
    enabled: true
  metrics:
    enabled: true
```

Apply the updated values:

```bash
helm upgrade haproxy-ingress haproxy-ingress/haproxy-ingress \
  --install \
  --namespace ingress-controller \
  -f haproxy-ingress-values.yaml
```

Query metrics:

```bash
# Forward the HAProxy Ingress service locally, then query metrics
kubectl -n ingress-controller port-forward svc/haproxy-ingress 9101:9101

# Check backend weights
curl http://localhost:9101/metrics | grep haproxy_backend_weight

# Check active servers
curl http://localhost:9101/metrics | grep haproxy_backend_active_servers

# Check response times
curl http://localhost:9101/metrics | grep haproxy_backend_response_time
```

### Testing Blue-Green Switch

Test the deployment switch:

```bash
# Test blue environment
curl -H "Host: app.example.com" http://HAPROXY_IP/
# Should return: blue-v1.0

# Switch to green
kubectl annotate ingress app-ingress \
  -n default \
  haproxy-ingress.github.io/blue-green-balance="version=blue=0,version=green=100" \
  haproxy-ingress.github.io/blue-green-mode="deploy" \
  --overwrite

# Wait for propagation
sleep 5

# Test green environment
curl -H "Host: app.example.com" http://HAPROXY_IP/
# Should return: green-v2.0

# Verify no downtime during switch
for i in {1..100}; do
  curl -s -H "Host: app.example.com" http://HAPROXY_IP/ &
done
wait
```

## Complete Blue-Green Workflow

Full workflow script:

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

NAMESPACE="default"
NEW_VERSION="$1"

echo "Starting blue-green deployment for version $NEW_VERSION"

# 1. Deploy to green environment
echo "Deploying to green environment..."
kubectl set image deployment/app-green \
  app=myapp:"$NEW_VERSION" \
  -n "$NAMESPACE"

# 2. Wait for rollout
kubectl rollout status deployment/app-green -n "$NAMESPACE"

# 3. Run smoke tests
echo "Running smoke tests on green..."
# Add your smoke tests here

# 4. Gradually shift traffic
echo "Shifting traffic to green..."
for weight in 10 25 50 75 100; do
  blue_weight=$((100 - weight))

  kubectl annotate ingress app-ingress \
    -n "$NAMESPACE" \
    haproxy-ingress.github.io/blue-green-balance="version=blue=$blue_weight,version=green=$weight" \
    haproxy-ingress.github.io/blue-green-mode="deploy" \
    --overwrite

  echo "Traffic: Blue $blue_weight%, Green $weight%"
  sleep 30
done

echo "Deployment complete - 100% traffic on green (version $NEW_VERSION)"
echo "Blue environment ready for rollback if needed"
```

## Conclusion

HAProxy Ingress provides robust support for blue-green deployments through its annotation system. By combining weight-based routing, health checks, and gradual traffic shifting, you can implement zero-downtime deployments with confidence. Always test thoroughly in the inactive environment, shift traffic gradually, and maintain the ability to rollback quickly. Monitor error rates and performance metrics during the transition to catch issues early and ensure smooth production releases.
