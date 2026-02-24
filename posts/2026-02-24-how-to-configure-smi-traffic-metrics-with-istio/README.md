# How to Configure SMI Traffic Metrics with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SMI, Traffic Metrics, Observability, Kubernetes, Prometheus

Description: Learn how to configure SMI Traffic Metrics with Istio to expose standardized service mesh metrics through a portable Kubernetes-native API.

---

Observability is a big part of why teams adopt a service mesh in the first place. Istio generates detailed telemetry data about every request flowing through the mesh. SMI Traffic Metrics provides a standard API to access this data in a portable way, meaning your dashboards and tooling can work across different mesh implementations without changes.

## What SMI Traffic Metrics Provides

SMI Traffic Metrics defines a Kubernetes API extension that exposes per-resource traffic metrics. Instead of querying Prometheus directly or using mesh-specific APIs, you can use standard Kubernetes API calls to get metrics for any resource in the mesh.

The metrics exposed follow the golden signals pattern:

- **Request count** - total number of requests
- **Request duration** - latency percentiles (p50, p90, p99)
- **Failure count** - number of failed requests (5xx responses)

These metrics are available at different resource levels: namespaces, deployments, pods, and individual services.

## Prerequisites

Install Istio with telemetry enabled:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled
```

Make sure Prometheus is running. The demo profile includes it by default:

```bash
kubectl get pods -n istio-system -l app=prometheus
```

Install the SMI metrics adapter:

```bash
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-metrics/master/deploy/adapter.yaml
```

The SMI metrics adapter runs as a Kubernetes API extension server. It queries Istio's Prometheus for the underlying data and exposes it through the standard Kubernetes API.

## Verifying the Metrics API

Check that the metrics API is registered:

```bash
kubectl api-resources | grep metrics.smi
```

You should see `TrafficMetrics` listed. You can also verify the API service:

```bash
kubectl get apiservice | grep smi
```

## Deploying Sample Workloads

Deploy some services that generate traffic:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: curlimages/curl:7.85.0
        command:
        - sh
        - -c
        - "while true; do curl -s http://backend/api; sleep 1; done"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: hashicorp/http-echo:0.2.3
        args: ["-text=hello"]
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 5678
```

```bash
kubectl apply -f workloads.yaml
```

Wait a minute or two for traffic to start flowing and metrics to accumulate.

## Querying Traffic Metrics

The SMI metrics API extends the Kubernetes API server. You query it using kubectl or any Kubernetes client:

**Get metrics for a specific deployment:**

```bash
kubectl get --raw "/apis/metrics.smi-spec.io/v1alpha1/namespaces/default/deployments/backend" | jq .
```

The response looks like:

```json
{
  "kind": "TrafficMetrics",
  "apiVersion": "metrics.smi-spec.io/v1alpha1",
  "metadata": {
    "name": "backend",
    "namespace": "default"
  },
  "timestamp": "2026-02-24T10:30:00Z",
  "window": "30s",
  "resource": {
    "name": "backend",
    "namespace": "default",
    "kind": "Deployment"
  },
  "edge": {
    "direction": "to"
  },
  "metrics": [
    {
      "name": "p99_response_latency",
      "unit": "ms",
      "value": "12"
    },
    {
      "name": "p90_response_latency",
      "unit": "ms",
      "value": "8"
    },
    {
      "name": "p50_response_latency",
      "unit": "ms",
      "value": "3"
    },
    {
      "name": "success_count",
      "value": "142"
    },
    {
      "name": "failure_count",
      "value": "0"
    }
  ]
}
```

**Get metrics for all deployments in a namespace:**

```bash
kubectl get --raw "/apis/metrics.smi-spec.io/v1alpha1/namespaces/default/deployments" | jq .
```

**Get metrics for a specific pod:**

```bash
kubectl get --raw "/apis/metrics.smi-spec.io/v1alpha1/namespaces/default/pods/backend-abc123" | jq .
```

## Edge Metrics: Understanding Service-to-Service Communication

One of the more useful aspects of SMI Traffic Metrics is edge metrics. These show you the traffic between specific source and destination pairs:

```bash
kubectl get --raw "/apis/metrics.smi-spec.io/v1alpha1/namespaces/default/deployments/backend/edges" | jq .
```

This returns a list of TrafficMetrics resources, each representing traffic from a specific source to the backend deployment. You can see which services are calling your backend and how much traffic each sends.

## Integrating with Dashboards

Since SMI Traffic Metrics uses the Kubernetes API, any tool that can query the Kubernetes API can consume these metrics. This is useful for building dashboards that work across different mesh implementations.

Here is a simple script that polls metrics and formats them:

```bash
#!/bin/bash

while true; do
  echo "=== Traffic Metrics $(date) ==="

  for deploy in $(kubectl get deploy -o jsonpath='{.items[*].metadata.name}'); do
    metrics=$(kubectl get --raw "/apis/metrics.smi-spec.io/v1alpha1/namespaces/default/deployments/$deploy" 2>/dev/null)

    if [ $? -eq 0 ]; then
      success=$(echo $metrics | jq -r '.metrics[] | select(.name=="success_count") | .value')
      failure=$(echo $metrics | jq -r '.metrics[] | select(.name=="failure_count") | .value')
      p99=$(echo $metrics | jq -r '.metrics[] | select(.name=="p99_response_latency") | .value')

      echo "$deploy: success=$success failure=$failure p99=${p99}ms"
    fi
  done

  sleep 10
done
```

## Configuring the Metrics Adapter

The SMI metrics adapter has configuration options for how it queries Prometheus and what time windows it uses.

You can configure the adapter through its deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smi-metrics
  namespace: istio-system
spec:
  template:
    spec:
      containers:
      - name: smi-metrics
        args:
        - --prometheus-url=http://prometheus.istio-system:9090
        - --metrics-window=30s
        - --log-level=info
```

The `--metrics-window` flag controls the time window over which metrics are aggregated. A shorter window gives you more real-time data but with more variance. A longer window smooths things out but is less responsive to sudden changes.

## Using Traffic Metrics for Automated Canary Analysis

SMI Traffic Metrics pairs well with Traffic Split for automated canary deployments. You can check the error rate of a canary before increasing its traffic share:

```bash
#!/bin/bash

CANARY_DEPLOY="web-app-v2"

metrics=$(kubectl get --raw "/apis/metrics.smi-spec.io/v1alpha1/namespaces/default/deployments/$CANARY_DEPLOY")

success=$(echo $metrics | jq -r '.metrics[] | select(.name=="success_count") | .value')
failure=$(echo $metrics | jq -r '.metrics[] | select(.name=="failure_count") | .value')

total=$((success + failure))

if [ $total -gt 0 ]; then
  error_rate=$(echo "scale=2; $failure * 100 / $total" | bc)
  echo "Canary error rate: ${error_rate}%"

  if (( $(echo "$error_rate < 5" | bc -l) )); then
    echo "Error rate acceptable, proceeding with rollout"
  else
    echo "Error rate too high, rolling back"
  fi
fi
```

## Comparing with Istio-Native Metrics

Istio exposes far more metrics than what SMI Traffic Metrics provides. Istio's Prometheus metrics include:

- `istio_requests_total` - with labels for source, destination, response code, etc.
- `istio_request_duration_milliseconds` - full histogram
- `istio_tcp_sent_bytes_total` and `istio_tcp_received_bytes_total`
- `istio_request_bytes` and `istio_response_bytes`

SMI Traffic Metrics gives you a simplified, standardized view. If you need the full detail, query Prometheus directly:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

Then query in the Prometheus UI or with curl:

```bash
curl 'http://localhost:9090/api/v1/query?query=istio_requests_total{destination_service="backend.default.svc.cluster.local"}'
```

## Troubleshooting

If metrics aren't showing up:

```bash
# Check if the metrics adapter is running
kubectl get pods -n istio-system -l app=smi-metrics

# Check adapter logs
kubectl logs -n istio-system -l app=smi-metrics

# Verify Prometheus has Istio metrics
kubectl port-forward -n istio-system svc/prometheus 9090:9090
# Then query: istio_requests_total

# Check the API service status
kubectl get apiservice v1alpha1.metrics.smi-spec.io -o yaml
```

Common issues include:

- Prometheus URL is wrong in the adapter configuration
- No traffic has flowed yet so there are no metrics to report
- The API service isn't registered properly
- RBAC permissions are missing for the adapter

SMI Traffic Metrics gives you a clean, portable interface for mesh observability. It is not a replacement for a full monitoring stack, but it works well as a standardized layer that tools and automation can rely on without being tied to a specific mesh implementation.
