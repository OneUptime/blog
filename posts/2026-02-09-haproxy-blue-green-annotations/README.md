# How to Use HAProxy Ingress Controller with Blue-Green Deployment Annotations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HAProxy, Deployments

Description: Learn how to implement blue-green deployments using HAProxy Ingress Controller annotations for zero-downtime releases, traffic switching, and safe production rollouts in Kubernetes environments.

---

Blue-green deployments provide zero-downtime releases by maintaining two identical production environments. HAProxy Ingress Controller supports blue-green deployments through annotations that control traffic routing between versions. This guide explores how to implement blue-green deployments using HAProxy's powerful annotation system.

## Understanding Blue-Green Deployments

Blue-green deployments work by:
- Running two identical production environments (blue and green)
- Routing all production traffic to one environment (active)
- Deploying new versions to the inactive environment
- Testing the new version thoroughly
- Switching traffic to the new version instantly
- Keeping the old version running for quick rollback

HAProxy Ingress Controller enables this pattern through weight-based routing and annotation-based configuration.

## Installing HAProxy Ingress Controller

Install HAProxy Ingress Controller:

```bash
# Using Helm
helm repo add haproxytech https://haproxytech.github.io/helm-charts
helm repo update

helm install haproxy-ingress haproxytech/kubernetes-ingress \
  --namespace haproxy-controller \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

Verify installation:

```bash
kubectl get pods -n haproxy-controller
kubectl get svc -n haproxy-controller
```

## Basic Blue-Green Setup

Create two deployments representing blue and green environments.

### Blue and Green Deployments

```yaml
# blue-deployment.yaml
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
# green-deployment.yaml
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

Use HAProxy annotations to control traffic distribution:

```yaml
# blue-green-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: default
  annotations:
    # HAProxy backend configuration
    haproxy.org/load-balance: "roundrobin"

    # Blue backend (100% traffic initially)
    haproxy.org/server-weight-blue: "100"

    # Green backend (0% traffic initially)
    haproxy.org/server-weight-green: "0"

    # Health check configuration
    haproxy.org/check: "enabled"
    haproxy.org/check-interval: "10s"
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
            name: app-blue
            port:
              number: 80
```

## Gradual Traffic Shifting

Implement canary-style gradual shifting between blue and green.

### Multi-Backend Ingress

Configure both backends with weights:

```yaml
# weighted-blue-green.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: weighted-app
  namespace: default
  annotations:
    haproxy.org/load-balance: "roundrobin"

    # Use backend switching based on weights
    haproxy.org/backend-config-snippet: |
      use-server app-blue weight 80
      use-server app-green weight 20

    # Server check configuration
    haproxy.org/check: "enabled"
    haproxy.org/check-interval: "5s"
    haproxy.org/check-timeout: "3s"

    # Connection timeouts
    haproxy.org/timeout-connect: "5s"
    haproxy.org/timeout-server: "30s"
spec:
  ingressClassName: haproxy
  rules:
  - host: app.example.com
    http:
      paths:
      # Blue backend - 80% traffic
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-blue
            port:
              number: 80
```

For more precise control, use ConfigMap:

```yaml
# haproxy-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-configmap
  namespace: haproxy-controller
data:
  backend-weights: |
    blue: 70
    green: 30
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

  kubectl annotate ingress $INGRESS \
    -n $NAMESPACE \
    haproxy.org/server-weight-blue="$blue_weight" \
    haproxy.org/server-weight-green="$green_weight" \
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
    haproxy.org/request-capture: "X-Beta-User"
    haproxy.org/backend-config-snippet: |
      # Route beta users to green
      acl is_beta_user req.hdr(X-Beta-User) -m found
      use-server app-green if is_beta_user

      # Default to blue
      use-server app-blue if !is_beta_user
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
            name: app-blue
            port:
              number: 80
```

### Path-Based Blue-Green

Different paths to different versions:

```yaml
# path-blue-green.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-routing
  namespace: default
  annotations:
    haproxy.org/path-rewrite: "/"
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

Maintain user session during rollout:

```yaml
# cookie-routing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cookie-routing
  namespace: default
  annotations:
    haproxy.org/cookie-persistence: "version"
    haproxy.org/backend-config-snippet: |
      # Check for version cookie
      acl has_green_cookie req.cook(version) -m str green
      use-server app-green if has_green_cookie

      # Set cookie based on backend
      cookie version insert indirect nocache
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
            name: app-blue
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
    # Enable health checks
    haproxy.org/check: "enabled"
    haproxy.org/check-http: "/health"
    haproxy.org/check-interval: "5s"
    haproxy.org/check-timeout: "3s"

    # Rise and fall thresholds
    haproxy.org/server-rise: "2"
    haproxy.org/server-fall: "3"

    # Don't route to unhealthy backends
    haproxy.org/backend-config-snippet: |
      option httpchk GET /health HTTP/1.1\r\nHost:\ app.example.com
      http-check expect status 200
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
            name: app-blue
            port:
              number: 80
```

### Automatic Rollback

Configure automatic rollback on errors:

```yaml
# auto-rollback.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auto-rollback-ingress
  namespace: default
  annotations:
    haproxy.org/check: "enabled"
    haproxy.org/check-interval: "10s"

    # Error threshold for rollback
    haproxy.org/backend-config-snippet: |
      # Track error rate
      stick-table type ip size 100k expire 30s store http_err_rate(10s)

      # Mark backend down if error rate > 10%
      acl error_rate http_err_rate gt 10
      use-server app-blue if error_rate
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
            name: app-green
            port:
              number: 80
```

## Monitoring Blue-Green Deployments

Monitor traffic distribution and health.

### Traffic Distribution Metrics

```yaml
# metrics-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-metrics
  namespace: haproxy-controller
data:
  prometheus.yaml: |
    global:
      stats socket /var/run/haproxy.sock mode 600 level admin
      stats timeout 2m

    frontend stats
      bind *:9090
      stats enable
      stats uri /metrics
      stats refresh 10s
```

Query metrics:

```bash
# Check backend weights
curl http://haproxy-metrics:9090/metrics | grep backend_weight

# Check active servers
curl http://haproxy-metrics:9090/metrics | grep backend_active_servers

# Check response times
curl http://haproxy-metrics:9090/metrics | grep response_time
```

### Testing Blue-Green Switch

Test the deployment switch:

```bash
# Test blue environment
curl -H "Host: app.example.com" http://HAPROXY_IP/
# Should return: blue-v1.0

# Switch to green
kubectl annotate ingress app-ingress \
  haproxy.org/server-weight-blue="0" \
  haproxy.org/server-weight-green="100" \
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
APP_NAME="myapp"
NEW_VERSION="$1"

echo "Starting blue-green deployment for version $NEW_VERSION"

# 1. Deploy to green environment
echo "Deploying to green environment..."
kubectl set image deployment/app-green \
  app=myapp:$NEW_VERSION \
  -n $NAMESPACE

# 2. Wait for rollout
kubectl rollout status deployment/app-green -n $NAMESPACE

# 3. Run smoke tests
echo "Running smoke tests on green..."
# Add your smoke tests here

# 4. Gradually shift traffic
echo "Shifting traffic to green..."
for weight in 10 25 50 75 100; do
  blue_weight=$((100 - weight))

  kubectl annotate ingress app-ingress \
    haproxy.org/server-weight-blue="$blue_weight" \
    haproxy.org/server-weight-green="$weight" \
    --overwrite -n $NAMESPACE

  echo "Traffic: Blue $blue_weight%, Green $weight%"
  sleep 30
done

echo "Deployment complete - 100% traffic on green (version $NEW_VERSION)"
echo "Blue environment ready for rollback if needed"
```

## Conclusion

HAProxy Ingress Controller provides robust support for blue-green deployments through its annotation system. By combining weight-based routing, health checks, and gradual traffic shifting, you can implement zero-downtime deployments with confidence. Always test thoroughly in the inactive environment, shift traffic gradually, and maintain the ability to rollback quickly. Monitor error rates and performance metrics during the transition to catch issues early and ensure smooth production releases.
