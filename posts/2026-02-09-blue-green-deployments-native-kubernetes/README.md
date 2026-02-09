# How to Implement Blue-Green Deployments Using Native Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment Strategies, Zero Downtime

Description: Learn how to implement blue-green deployment patterns in Kubernetes using native resources like Services and Deployments for instant zero-downtime updates and easy rollback.

---

Blue-green deployment is a release strategy where you maintain two identical production environments, one active (blue) and one idle (green). When deploying a new version, you update the green environment, test it thoroughly, then switch traffic from blue to green instantly. This approach provides zero-downtime deployments and instant rollback capability.

Kubernetes makes blue-green deployments straightforward using label selectors on Services to switch traffic between deployment versions.

## Basic Blue-Green Pattern

The core concept uses a Service with a version selector:

```yaml
# Production service pointing to blue
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web-app
    version: blue  # Points to blue deployment
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
---
# Blue deployment (currently active)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
      version: blue
  template:
    metadata:
      labels:
        app: web-app
        version: blue
    spec:
      containers:
      - name: app
        image: web-app:v1.0
        ports:
        - containerPort: 8080
---
# Green deployment (new version, not receiving traffic yet)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
      version: green
  template:
    metadata:
      labels:
        app: web-app
        version: green
    spec:
      containers:
      - name: app
        image: web-app:v2.0
        ports:
        - containerPort: 8080
```

Switch traffic from blue to green:

```bash
# Verify green is healthy
kubectl rollout status deployment/web-app-green

# Switch traffic to green
kubectl patch service web-app -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic switched
kubectl describe service web-app | grep Selector
```

Rollback if needed:

```bash
# Instantly rollback to blue
kubectl patch service web-app -p '{"spec":{"selector":{"version":"blue"}}}'
```

## Complete Blue-Green Implementation

Full production-ready setup:

```yaml
# Namespace for the application
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
# Production service
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
  labels:
    app: api
spec:
  selector:
    app: api
    env: production
    active: "true"  # Use custom label for active version
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
  type: LoadBalancer
---
# Blue deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-blue
  namespace: production
  labels:
    app: api
    version: blue
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: blue
  template:
    metadata:
      labels:
        app: api
        version: blue
        env: production
        active: "true"  # Initially active
    spec:
      containers:
      - name: api
        image: api:v1.5.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: VERSION
          value: "1.5.0"
        - name: ENVIRONMENT
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
---
# Green deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-green
  namespace: production
  labels:
    app: api
    version: green
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: green
  template:
    metadata:
      labels:
        app: api
        version: green
        env: production
        active: "false"  # Initially inactive
    spec:
      containers:
      - name: api
        image: api:v2.0.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: VERSION
          value: "2.0.0"
        - name: ENVIRONMENT
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
---
# Internal test service for green
apiVersion: v1
kind: Service
metadata:
  name: api-service-green-test
  namespace: production
spec:
  selector:
    app: api
    version: green
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

## Automated Deployment Script

Automate the blue-green switch:

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

NAMESPACE="production"
APP_NAME="api"
NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <new-version>"
    exit 1
fi

# Determine current active deployment
CURRENT_ACTIVE=$(kubectl get service ${APP_NAME}-service -n $NAMESPACE \
    -o jsonpath='{.spec.selector.version}')

if [ "$CURRENT_ACTIVE" == "blue" ]; then
    NEW_ACTIVE="green"
    OLD_ACTIVE="blue"
else
    NEW_ACTIVE="blue"
    OLD_ACTIVE="green"
fi

echo "Current active: $OLD_ACTIVE"
echo "Deploying to: $NEW_ACTIVE"

# Update the inactive deployment
echo "Updating ${APP_NAME}-${NEW_ACTIVE} to version $NEW_VERSION..."
kubectl set image deployment/${APP_NAME}-${NEW_ACTIVE} \
    api=${APP_NAME}:${NEW_VERSION} \
    -n $NAMESPACE

# Wait for rollout to complete
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/${APP_NAME}-${NEW_ACTIVE} -n $NAMESPACE

# Update labels
kubectl patch deployment ${APP_NAME}-${NEW_ACTIVE} -n $NAMESPACE \
    -p '{"spec":{"template":{"metadata":{"labels":{"active":"true"}}}}}'

# Run smoke tests against new deployment
echo "Running smoke tests..."
TEST_SERVICE="${APP_NAME}-service-${NEW_ACTIVE}-test"
TEST_URL=$(kubectl get service $TEST_SERVICE -n $NAMESPACE \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if curl -f http://$TEST_URL/healthz; then
    echo "Smoke tests passed!"
else
    echo "Smoke tests failed! Aborting switch."
    exit 1
fi

# Switch traffic
echo "Switching traffic to $NEW_ACTIVE..."
kubectl patch service ${APP_NAME}-service -n $NAMESPACE \
    -p "{\"spec\":{\"selector\":{\"version\":\"${NEW_ACTIVE}\"}}}"

# Update old deployment label
kubectl patch deployment ${APP_NAME}-${OLD_ACTIVE} -n $NAMESPACE \
    -p '{"spec":{"template":{"metadata":{"labels":{"active":"false"}}}}}'

echo "Deployment complete! Traffic switched to $NEW_ACTIVE"
echo "Old deployment ($OLD_ACTIVE) is still running for rollback if needed"
echo ""
echo "To rollback: kubectl patch service ${APP_NAME}-service -n $NAMESPACE \\"
echo "  -p '{\"spec\":{\"selector\":{\"version\":\"${OLD_ACTIVE}\"}}}'"
```

## Testing Strategy

Test the green environment before switching:

```yaml
# Create a test ingress for green environment
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-green-test
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api-green-test.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service-green-test
            port:
              number: 80
```

Run integration tests:

```bash
# Test green deployment
curl https://api-green-test.example.com/healthz
curl https://api-green-test.example.com/api/v1/status

# Run load tests
kubectl run load-test --image=loadtest:1.0 --restart=Never -- \
    --url=https://api-green-test.example.com \
    --duration=5m \
    --requests=1000
```

## Monitoring During Switch

Track traffic distribution:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import time

config.load_kube_config()
v1 = client.CoreV1Api()

def monitor_traffic_switch(namespace, service_name):
    """Monitor endpoints during blue-green switch."""
    print(f"Monitoring service: {namespace}/{service_name}")

    while True:
        endpoints = v1.read_namespaced_endpoints(service_name, namespace)

        blue_count = 0
        green_count = 0

        if endpoints.subsets:
            for subset in endpoints.subsets:
                if subset.addresses:
                    for address in subset.addresses:
                        if address.target_ref:
                            pod = v1.read_namespaced_pod(
                                address.target_ref.name, namespace)
                            version = pod.metadata.labels.get('version', 'unknown')

                            if version == 'blue':
                                blue_count += 1
                            elif version == 'green':
                                green_count += 1

        print(f"Blue endpoints: {blue_count}, Green endpoints: {green_count}")
        time.sleep(5)

if __name__ == "__main__":
    monitor_traffic_switch("production", "api-service")
```

## Database Migration Handling

Handle schema changes carefully:

```yaml
# Use init container for forward-compatible migrations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-green
spec:
  template:
    spec:
      initContainers:
      - name: migrate
        image: api:v2.0.0
        command: ["/app/migrate.sh"]
        env:
        - name: MIGRATION_MODE
          value: "forward-compatible"  # Don't break blue version
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
      containers:
      - name: api
        image: api:v2.0.0
```

## Resource Management

Scale down the old deployment after verification:

```bash
# After successful switch and verification period
kubectl scale deployment/api-blue --replicas=1 -n production

# Or completely remove after full confidence
kubectl delete deployment/api-blue -n production
```

## Best Practices

Always test the green environment thoroughly before switching traffic. Use internal test services or ingresses.

Maintain both environments at full capacity during the switch. Don't scale down blue until green is proven stable.

Use health checks and readiness probes. Ensure all green pods are ready before switching.

Implement automated smoke tests. Verify critical functionality before switching traffic.

Monitor metrics during and after the switch. Watch for error rates, latency, and resource usage.

Keep the old environment running for a period. Allow time to detect issues before removing blue.

Document rollback procedures. Ensure teams know how to quickly revert if problems occur.

Consider database compatibility. Schema changes must work with both blue and green versions.

Use progressive rollout for extra safety:

```bash
# Switch only part of traffic first
kubectl patch service api-service -n production \
    -p '{"spec":{"selector":{"active":"true"}}}' # Both blue and green have this label temporarily
```

Plan for resource overhead. Running two full environments doubles resource requirements during deployment.

Blue-green deployments provide the safest and most reliable deployment strategy with instant rollback capability, making them ideal for production systems where uptime is critical.
