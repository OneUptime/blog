# How to Set Up Linkerd Tap and Viz Dashboard for Real-Time Traffic Inspection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Service Mesh, Observability, Traffic Inspection, Debugging

Description: Learn how to install and configure Linkerd Tap and Viz dashboard for real-time traffic inspection, debugging service communication issues.

---

Debugging microservices traffic requires real-time visibility into requests as they flow through your mesh. Linkerd's Tap feature provides live request inspection without sampling, while the Viz dashboard offers graphical insights into traffic patterns, success rates, and latencies.

This guide walks you through setting up both tools and using them effectively to troubleshoot production issues and understand service behavior.

## Installing Linkerd Viz Extension

The Viz extension provides the dashboard and metrics components:

```bash
# Install Linkerd core first

linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Verify core installation
linkerd check

# Install Viz extension
linkerd viz install | kubectl apply -f -

# Verify Viz installation
linkerd viz check
```

Verify the Viz components are running:

```bash
kubectl get pods -n linkerd-viz

# Expected components include:
# metrics-api, prometheus, tap, tap-injector, and web
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

Filter by path prefix:

```bash
# Requests to /api/users endpoints
linkerd viz tap deploy/api-gateway --path /api/users

# Requests to versioned API endpoints
linkerd viz tap deploy/api-gateway --path /api/v1
```

Filter by response status with JSON output:

```bash
# Only errors
linkerd viz tap deploy/api-gateway --to deploy/backend -o json | \
  jq 'select(.responseInit.httpStatus >= 500 and .responseInit.httpStatus < 600)'

# Specific status code
linkerd viz tap deploy/api-gateway -o json | \
  jq 'select(.responseInit.httpStatus == 404)'
```

## Inspecting Request and Response Bodies

View request headers:

```bash
# Show all headers
linkerd viz tap deploy/api-gateway -o json | jq '.requestInit.headers'

# Filter specific header
linkerd viz tap deploy/api-gateway -o json | \
  jq 'select(any(.requestInit.headers[]?; .name == "authorization"))'
```

Linkerd Tap exposes request and response metadata such as headers, but not request or response bodies. To inspect bodies, use application-level logging or a dedicated debugging proxy temporarily.

## Tapping Traffic Between Services

Monitor traffic from one service to another:

```bash
# Tap requests from frontend to backend
linkerd viz tap deploy/frontend --to deploy/backend -n production

# Tap all traffic to a specific service
linkerd viz tap ns/data-layer --to svc/database-proxy -n data-layer
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
linkerd viz tap deploy/api-gateway -o json | \
  jq 'select(.responseInit.httpStatus >= 500 and .responseInit.httpStatus < 600)'

# Show 4xx client errors
linkerd viz tap deploy/api-gateway -o json | \
  jq 'select(.responseInit.httpStatus >= 400 and .responseInit.httpStatus < 500)'
```

Identify slow requests:

```bash
# Tap with custom max requests
linkerd viz tap deploy/api-gateway --max-rps 100 -o json | \
  jq 'select(((.responseEnd.sinceRequestInit.seconds // 0) * 1000 + ((.responseEnd.sinceRequestInit.nanos // 0) / 1000000)) > 1000)'
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
ERRORS=$(timeout 30s linkerd viz tap deploy/$DEPLOYMENT -n $NAMESPACE -o json | \
  jq -c 'select(.responseInit.httpStatus >= 500 and .responseInit.httpStatus < 600)' | wc -l)

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
      serviceAccountName: tap-viewer
      containers:
      - name: validator
        image: cr.l5d.io/linkerd/cli-bin:edge-26.5.5
        command:
        - /bin/sh
        - -c
        - |
          linkerd viz tap deploy/api-gateway --max-rps 10 -o json | \
            jq -c 'select(.responseInit.httpStatus >= 500 and .responseInit.httpStatus < 600)' &
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
kind: ClusterRoleBinding
metadata:
  name: tap-viewer
subjects:
- kind: ServiceAccount
  name: tap-viewer
  namespace: production
roleRef:
  kind: ClusterRole
  name: linkerd-linkerd-viz-tap-admin
  apiGroup: rbac.authorization.k8s.io
```

Use the ServiceAccount for tap operations:

```bash
# Verify tap access for the ServiceAccount
kubectl auth can-i watch deployments.tap.linkerd.io -n production \
  --as=system:serviceaccount:production:tap-viewer

# Use a kubeconfig context authenticated as tap-viewer, or run the CLI
# from a Kubernetes Job that uses serviceAccountName: tap-viewer.
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

Use Linkerd's Prometheus metrics alongside tap data:

```bash
# Query request and latency metrics from the Viz Prometheus instance
kubectl -n linkerd-viz port-forward svc/prometheus 9090:9090
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

Tap adds minimal overhead because it observes metadata at the proxy and does not serialize full request or response bodies. However, be mindful when tapping high-traffic services:

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
# Check tap service
kubectl get pods -n linkerd-viz -l linkerd.io/control-plane-component=tap

# Verify RBAC permissions
kubectl auth can-i watch deployments.tap.linkerd.io -n production \
  --as=system:serviceaccount:production:default

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
