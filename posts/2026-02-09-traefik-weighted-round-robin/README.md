# How to Configure Traefik IngressRoute with Weighted Round Robin Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Traefik, Load Balancing

Description: Master weighted round robin load balancing in Traefik using IngressRoute resources to implement canary deployments, A/B testing, and gradual rollouts in Kubernetes environments.

---

Traefik's IngressRoute CRD provides sophisticated load balancing capabilities including weighted round robin distribution. This feature enables you to split traffic between multiple service versions based on percentage weights, making it perfect for canary deployments, A/B testing, and gradual feature rollouts. This guide explores how to implement weighted load balancing effectively.

## Understanding Weighted Round Robin

Weighted round robin distributes requests across multiple backends based on assigned weights. Unlike simple round robin that treats all backends equally, weighted round robin allows you to control the proportion of traffic each backend receives. For example, with weights of 90 and 10, 90% of requests go to one backend and 10% to another.

This is essential for:
- Canary deployments (testing new versions with small traffic percentages)
- A/B testing (comparing different feature sets)
- Gradual rollouts (slowly increasing traffic to new versions)
- Multi-region routing (controlling traffic distribution)

## Basic Weighted Round Robin

Configure simple weighted traffic splitting.

### Two-Version Traffic Split

Route 80% to stable version and 20% to canary:

```yaml
# weighted-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: weighted-app
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    services:
    # Stable version - 80% traffic
    - name: app-v1
      port: 80
      weight: 80
    # Canary version - 20% traffic
    - name: app-v2
      port: 80
      weight: 20
  tls:
    secretName: app-tls-cert
---
# Stable version deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-v1
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: v1
  template:
    metadata:
      labels:
        app: myapp
        version: v1
    spec:
      containers:
      - name: app
        image: myapp:1.0
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: app-v1
  namespace: default
spec:
  selector:
    app: myapp
    version: v1
  ports:
  - port: 80
---
# Canary version deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-v2
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
      version: v2
  template:
    metadata:
      labels:
        app: myapp
        version: v2
    spec:
      containers:
      - name: app
        image: myapp:2.0
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: app-v2
  namespace: default
spec:
  selector:
    app: myapp
    version: v2
  ports:
  - port: 80
```

## Gradual Canary Rollout

Implement a progressive canary deployment strategy.

### Multi-Stage Canary

Gradually increase canary traffic:

```bash
#!/bin/bash
# canary-rollout.sh

NAMESPACE="default"
ROUTE_NAME="weighted-app"

# Stage 1: 5% canary
echo "Stage 1: 5% canary traffic"
kubectl apply -f - <<EOF
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: $ROUTE_NAME
  namespace: $NAMESPACE
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(\`app.example.com\`)
    kind: Rule
    services:
    - name: app-v1
      port: 80
      weight: 95
    - name: app-v2
      port: 80
      weight: 5
EOF

sleep 300  # Monitor for 5 minutes

# Stage 2: 25% canary
echo "Stage 2: 25% canary traffic"
kubectl patch ingressroute $ROUTE_NAME -n $NAMESPACE --type=merge -p '{"spec":{"routes":[{"match":"Host(\`app.example.com\`)","kind":"Rule","services":[{"name":"app-v1","port":80,"weight":75},{"name":"app-v2","port":80,"weight":25}]}]}}'

sleep 300

# Stage 3: 50% canary
echo "Stage 3: 50% canary traffic"
kubectl patch ingressroute $ROUTE_NAME -n $NAMESPACE --type=merge -p '{"spec":{"routes":[{"match":"Host(\`app.example.com\`)","kind":"Rule","services":[{"name":"app-v1","port":80,"weight":50},{"name":"app-v2","port":80,"weight":50}]}]}}'

sleep 300

# Stage 4: 100% canary
echo "Stage 4: 100% canary traffic"
kubectl patch ingressroute $ROUTE_NAME -n $NAMESPACE --type=merge -p '{"spec":{"routes":[{"match":"Host(\`app.example.com\`)","kind":"Rule","services":[{"name":"app-v2","port":80,"weight":100}]}]}}'
```

## A/B Testing Configuration

Configure A/B testing with header-based routing.

### Header-Based Weight Distribution

Route users to different versions based on headers:

```yaml
# ab-testing.yaml
# Default users - weighted distribution
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: ab-default
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    priority: 1
    services:
    - name: app-v1
      port: 80
      weight: 50
    - name: app-v2
      port: 80
      weight: 50
---
# Beta users - all to v2
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: ab-beta
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`) && Headers(`X-Beta-User`, `true`)
    kind: Rule
    priority: 10
    services:
    - name: app-v2
      port: 80
```

## Multi-Region Load Balancing

Distribute traffic across geographic regions.

### Regional Weight Distribution

```yaml
# multi-region.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: multi-region-app
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    services:
    # US region - 40% traffic
    - name: app-us-east
      port: 80
      weight: 40
    # EU region - 40% traffic
    - name: app-eu-west
      port: 80
      weight: 40
    # APAC region - 20% traffic
    - name: app-asia-pacific
      port: 80
      weight: 20
```

## Advanced Weighted Routing

Combine weights with other routing rules.

### Path-Based Weighted Routing

Different weights for different paths:

```yaml
# path-weighted.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: path-weighted
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  # API endpoints - conservative rollout
  - match: Host(`app.example.com`) && PathPrefix(`/api`)
    kind: Rule
    services:
    - name: app-v1
      port: 80
      weight: 90
    - name: app-v2
      port: 80
      weight: 10

  # UI endpoints - aggressive rollout
  - match: Host(`app.example.com`) && PathPrefix(`/ui`)
    kind: Rule
    services:
    - name: app-v1
      port: 80
      weight: 30
    - name: app-v2
      port: 80
      weight: 70
```

### Weighted Routing with Middleware

Apply middleware to weighted services:

```yaml
# weighted-with-middleware.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: default
spec:
  rateLimit:
    average: 100
    burst: 200
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: weighted-limited
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    middlewares:
    - name: rate-limit
    services:
    - name: app-v1
      port: 80
      weight: 70
    - name: app-v2
      port: 80
      weight: 30
```

## Service Health and Circuit Breaking

Combine weighted routing with health checks.

### Weighted Services with Health Checks

```yaml
# health-checked-weights.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: health-weighted
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    services:
    - name: app-v1
      port: 80
      weight: 80
      healthCheck:
        path: /healthz
        interval: 10s
        timeout: 3s
    - name: app-v2
      port: 80
      weight: 20
      healthCheck:
        path: /healthz
        interval: 10s
        timeout: 3s
```

## Testing Weighted Distribution

Verify traffic distribution:

```bash
# Test traffic distribution
for i in {1..100}; do
  curl -s https://app.example.com/ | grep "version"
done | sort | uniq -c

# Should show approximately:
# 80 version: v1
# 20 version: v2

# Test with specific header
curl -H "X-Beta-User: true" https://app.example.com/

# Load testing with weight verification
ab -n 1000 -c 10 https://app.example.com/ | grep "Version"
```

Monitor weight distribution:

```bash
# Check Traefik dashboard
kubectl port-forward -n traefik svc/traefik 9000:9000
# Visit http://localhost:9000/dashboard/

# Check service weights in metrics
curl http://localhost:9000/metrics | grep service_backend
```

## Automated Canary Deployment

Complete automation script:

```bash
#!/bin/bash
# automated-canary.sh

set -e

NAMESPACE="default"
ROUTE_NAME="weighted-app"
NEW_VERSION="$1"
ERROR_THRESHOLD=5

echo "Starting canary deployment for version $NEW_VERSION"

# Deploy canary
kubectl set image deployment/app-v2 app=myapp:$NEW_VERSION -n $NAMESPACE
kubectl rollout status deployment/app-v2 -n $NAMESPACE

# Progressive rollout with monitoring
WEIGHTS=(5 10 25 50 75 100)
for weight in "${WEIGHTS[@]}"; do
  stable_weight=$((100 - weight))

  echo "Setting weights: stable=$stable_weight%, canary=$weight%"

  # Update weights
  cat <<EOF | kubectl apply -f -
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: $ROUTE_NAME
  namespace: $NAMESPACE
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(\`app.example.com\`)
    kind: Rule
    services:
    - name: app-v1
      port: 80
      weight: $stable_weight
    - name: app-v2
      port: 80
      weight: $weight
EOF

  # Monitor error rate
  sleep 60

  # Check metrics (pseudo-code)
  ERROR_RATE=$(check_error_rate)

  if (( $(echo "$ERROR_RATE > $ERROR_THRESHOLD" | bc -l) )); then
    echo "Error rate too high! Rolling back..."
    # Rollback to 100% stable
    kubectl patch ingressroute $ROUTE_NAME -n $NAMESPACE --type=merge \
      -p '{"spec":{"routes":[{"services":[{"name":"app-v1","port":80,"weight":100}]}]}}'
    exit 1
  fi

  echo "Health check passed at $weight% canary traffic"
done

echo "Canary deployment successful!"
```

## Troubleshooting

Common issues:

**Uneven distribution**: Check service readiness:
```bash
kubectl get pods -l app=myapp
kubectl describe service app-v1
```

**Traffic not splitting**: Verify IngressRoute syntax:
```bash
kubectl describe ingressroute weighted-app
```

**Sticky sessions interfering**: Disable session affinity if not needed

## Conclusion

Traefik's weighted round robin load balancing provides powerful capabilities for canary deployments, A/B testing, and gradual rollouts. By controlling traffic distribution with weights, you can safely test new versions with real production traffic while minimizing risk. Always start with small weights, monitor error rates carefully, and have rollback procedures ready. Combined with health checks and automated deployment scripts, weighted routing enables safe, confident production releases.
