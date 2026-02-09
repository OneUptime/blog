# How to Set Up Linkerd Tap and Viz Dashboard for Real-Time Traffic Inspection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Service Mesh, Observability, Traffic Inspection, Debugging

Description: Learn how to install and configure Linkerd Tap and Viz dashboard for real-time traffic inspection, debugging service communication issues, and gaining instant visibility into request flows across your mesh.

---

Debugging microservices traffic requires real-time visibility into requests as they flow through your mesh. Linkerd's Tap feature provides live request inspection without sampling, while the Viz dashboard offers graphical insights into traffic patterns, success rates, and latencies.

This guide walks you through setting up both tools and using them effectively to troubleshoot production issues and understand service behavior.

## Installing Linkerd Viz Extension

The Viz extension provides the dashboard and metrics components:

```bash
# Install Linkerd core first
linkerd install | kubectl apply -f -

# Verify core installation
linkerd check

# Install Viz extension
linkerd viz install | kubectl apply -f -

# Verify Viz installation
linkerd check --proxy
```

Verify the Viz components are running:

```bash
kubectl get pods -n linkerd-viz

# Expected output:
# metrics-api
# prometheus
# tap
# tap-injector
# web
```

## Accessing the Viz Dashboard

Forward the dashboard port to your local machine:

```bash
# Start port forward
linkerd viz dashboard &

# Or specify custom port
linkerd viz dashboard --port 8084
```

The dashboard opens automatically at `http://localhost:50750`. You'll see namespace-level metrics, deployment health, and live traffic graphs.

## Using Linkerd Tap for Live Traffic Inspection

Tap streams live requests in real-time. Start by tapping a deployment:

```bash
# Tap all traffic to a deployment
linkerd viz tap deploy/api-gateway -n production

# Output shows live requests:
# req id=0:1 proxy=in  src=10.1.2.3:45678 dst=10.1.2.4:8080 :method=GET :authority=api-gateway:8080 :path=/users/123
# rsp id=0:1 proxy=in  src=10.1.2.3:45678 dst=10.1.2.4:8080 :status=200 latency=23ms
```

Each line shows request and response details including source, destination, HTTP method, path, status code, and latency.

## Filtering Tap Output

Filter by HTTP method:

```bash
# Only GET requests
linkerd viz tap deploy/api-gateway --method GET

# Only POST requests
linkerd viz tap deploy/payment-service --method POST
```

Filter by path pattern:

```bash
# Requests to /api/users endpoints
linkerd viz tap deploy/api-gateway --path /api/users

# Requests matching regex
linkerd viz tap deploy/api-gateway --path "^/api/v[0-9]+"
```

Filter by response status:

```bash
# Only errors
linkerd viz tap deploy/api-gateway --to deploy/backend --status 5xx

# Specific status code
linkerd viz tap deploy/api-gateway --status 404
```

## Inspecting Request and Response Bodies

View request headers:

```bash
# Show all headers
linkerd viz tap deploy/api-gateway -o json | jq '.requestInit.headers'

# Filter specific header
linkerd viz tap deploy/api-gateway -o json | \
  jq 'select(.requestInit.headers.authorization != null)'
```

Linkerd Tap does not expose request/response bodies by default for security and performance. To inspect bodies, use the debug sidecar or enable verbose logging temporarily.

## Tapping Traffic Between Services

Monitor traffic from one service to another:

```bash
# Tap requests from frontend to backend
linkerd viz tap deploy/frontend --to deploy/backend -n production

# Tap all traffic to a specific service
linkerd viz tap --to svc/database-proxy -n data-layer
```

Find which services are calling your deployment:

```bash
# Show source deployments
linkerd viz tap deploy/api-gateway -o json | \
  jq -r '.source.pod' | sort -u
```

## Debugging Failed Requests

Find all failed requests:

```bash
# Show only 5xx errors
linkerd viz tap deploy/api-gateway --status 5xx

# Show 4xx client errors
linkerd viz tap deploy/api-gateway --status 4xx
```

Identify slow requests:

```bash
# Tap with custom max requests
linkerd viz tap deploy/api-gateway --max-rps 100 | \
  awk '$NF ~ /latency/ { print $0 }' | \
  awk '{ gsub(/latency=/, ""); gsub(/ms/, ""); if ($NF > 1000) print $0 }'
```

## Using Tap in CI/CD Pipelines

Create automated traffic validation:

```bash
#!/bin/bash
# validate-deployment.sh

NAMESPACE="production"
DEPLOYMENT="api-gateway"
ERROR_THRESHOLD=5

# Tap for 30 seconds
echo "Monitoring $DEPLOYMENT for errors..."
ERRORS=$(timeout 30s linkerd viz tap deploy/$DEPLOYMENT -n $NAMESPACE --status 5xx | wc -l)

if [ "$ERRORS" -gt "$ERROR_THRESHOLD" ]; then
  echo "ERROR: Found $ERRORS server errors, threshold is $ERROR_THRESHOLD"
  exit 1
fi

echo "Success: Only $ERRORS errors detected"
exit 0
```

Use in deployment pipeline:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-traffic
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: linkerd-tap
      containers:
      - name: validator
        image: linkerd/cli-bin:stable-2.14.0
        command:
        - /bin/sh
        - -c
        - |
          linkerd viz tap deploy/api-gateway --status 5xx --max-rps 10 &
          TAP_PID=$!
          sleep 30
          kill $TAP_PID
      restartPolicy: Never
```

## Configuring Tap RBAC Permissions

Create a ServiceAccount with tap permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tap-viewer
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tap-viewer
  namespace: production
rules:
- apiGroups: ["tap.linkerd.io"]
  resources: ["*"]
  verbs: ["watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tap-viewer
  namespace: production
subjects:
- kind: ServiceAccount
  name: tap-viewer
  namespace: production
roleRef:
  kind: Role
  name: tap-viewer
  apiGroup: rbac.authorization.k8s.io
```

Use the ServiceAccount for tap operations:

```bash
# Generate kubeconfig for tap-viewer
kubectl create token tap-viewer -n production --duration=24h > /tmp/tap-token

# Use with linkerd
linkerd viz tap deploy/api-gateway -n production \
  --context tap-viewer
```

## Exploring the Viz Dashboard

The dashboard provides several views:

1. **Namespace view**: Shows all deployments in a namespace with success rates and traffic volume
2. **Deployment view**: Detailed metrics for a specific deployment including upstream and downstream dependencies
3. **Pod view**: Per-pod metrics showing resource usage and traffic patterns
4. **Tap view**: Live traffic inspection with filtering

Navigate to a deployment for detailed insights:

```bash
# Open dashboard to specific deployment
linkerd viz dashboard &
# Then navigate to: Namespaces > production > api-gateway
```

## Integrating Tap with Monitoring

Stream tap data to Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tap-exporter
  namespace: linkerd-viz
data:
  config.yaml: |
    deployments:
    - namespace: production
      name: api-gateway
      metrics:
      - request_total
      - response_latency_ms
```

Create custom metrics from tap data:

```bash
# Count requests per minute
linkerd viz tap deploy/api-gateway -o json | \
  jq -r 'select(.proxyDirection=="INBOUND") | .requestInit.path' | \
  sort | uniq -c | sort -rn
```

## Alerting on Tap Observations

Set up alerts for abnormal traffic patterns:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tap-based-alerts
  namespace: linkerd-viz
spec:
  groups:
  - name: tap_alerts
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(response_total{classification="failure"}[1m]))
        /
        sum(rate(response_total[1m]))
        > 0.05
      for: 2m
      annotations:
        summary: "Error rate above 5% for {{ $labels.deployment }}"
```

## Performance Impact and Best Practices

Tap adds minimal overhead because it samples at the proxy level without serializing full requests. However, be mindful when tapping high-traffic services:

```bash
# Limit tap output
linkerd viz tap deploy/api-gateway --max-rps 100

# Tap for limited duration
timeout 60s linkerd viz tap deploy/api-gateway
```

Never leave tap running indefinitely in production. Use it for specific debugging sessions, then terminate.

Grant tap permissions carefully. Tap exposes all request metadata including headers that may contain sensitive information.

## Troubleshooting Tap Issues

If tap fails to connect:

```bash
# Check tap injector
kubectl get pods -n linkerd-viz -l linkerd.io/control-plane-component=tap

# Verify RBAC permissions
kubectl auth can-i watch tap --as=system:serviceaccount:production:default

# Check pod annotation
kubectl get pod -n production api-gateway-xxxxx -o jsonpath='{.metadata.annotations}'
```

Check tap logs:

```bash
kubectl logs -n linkerd-viz deployment/tap -f
```

Verify the service has Linkerd proxy injected:

```bash
linkerd viz check --proxy -n production
```

Linkerd Tap and Viz provide unparalleled real-time visibility into your service mesh, making debugging and monitoring intuitive and immediate.
