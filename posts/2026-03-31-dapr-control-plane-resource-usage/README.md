# How to Monitor Dapr Control Plane Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Control Plane, Monitoring, Resource, Kubernetes

Description: Monitor CPU and memory usage of the Dapr control plane components to right-size resources, detect memory leaks, and prevent resource starvation in production clusters.

---

## Dapr Control Plane Components

The Dapr control plane consists of several components, each with distinct resource profiles:

| Component | Role | Typical Resource Use |
|-----------|------|---------------------|
| dapr-operator | Manages Dapr CRDs and components | Low-moderate CPU, low memory |
| dapr-placement | Actor placement hash ring | Low CPU, scales with actor count |
| dapr-sentry | Certificate issuance CA | Spikes during mass restarts |
| dapr-sidecar-injector | Mutating webhook | Low, spikes during deployments |
| dapr-scheduler | Job scheduling | Moderate, grows with job count |

## Querying Resource Usage with kubectl

```bash
# CPU and memory usage for all control plane pods
kubectl top pods -n dapr-system --sort-by=cpu

# Resource requests vs limits
kubectl get pods -n dapr-system -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    name = pod['metadata']['name']
    for c in pod['spec']['containers']:
        res = c.get('resources', {})
        req = res.get('requests', {})
        lim = res.get('limits', {})
        print(f'{name}/{c[\"name\"]}: CPU req={req.get(\"cpu\",\"N/A\")} lim={lim.get(\"cpu\",\"N/A\")} | Mem req={req.get(\"memory\",\"N/A\")} lim={lim.get(\"memory\",\"N/A\")}')
"
```

## Prometheus Queries for Resource Monitoring

Track resource usage trends over time:

```bash
# CPU usage per control plane component
sum by (pod) (
  rate(container_cpu_usage_seconds_total{
    namespace="dapr-system",
    container!="POD"
  }[5m])
)

# Memory usage per component
sum by (pod) (
  container_memory_working_set_bytes{
    namespace="dapr-system",
    container!="POD"
  }
)

# Memory usage as percentage of limit
(
  container_memory_working_set_bytes{namespace="dapr-system"}
  /
  container_spec_memory_limit_bytes{namespace="dapr-system"}
) * 100
```

## Recommended Resource Limits

Based on cluster size, set appropriate resource limits:

```yaml
# For clusters with <100 services
dapr_operator:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 300m
      memory: 256Mi

dapr_sentry:
  resources:
    requests:
      cpu: 100m
      memory: 64Mi
    limits:
      cpu: 500m
      memory: 256Mi

dapr_placement:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 300m
      memory: 256Mi
```

## Alerting on Resource Pressure

```yaml
groups:
  - name: control-plane-resources
    rules:
      - alert: DaprControlPlaneHighMemory
        expr: >
          (container_memory_working_set_bytes{namespace="dapr-system"}
          / container_spec_memory_limit_bytes{namespace="dapr-system"}) > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Dapr control plane component {{ $labels.pod }} is using >85% of memory limit"

      - alert: DaprControlPlaneHighCPU
        expr: >
          rate(container_cpu_usage_seconds_total{namespace="dapr-system"}[5m])
          / container_spec_cpu_quota{namespace="dapr-system"} * 100000 > 0.80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Dapr control plane component {{ $labels.pod }} CPU usage is high"
```

## Applying Resource Updates via Helm

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_sentry.resources.limits.memory=512Mi \
  --set dapr_sentry.resources.requests.cpu=200m \
  --reuse-values
```

## Summary

Monitor Dapr control plane resource usage using `kubectl top` for spot checks and Prometheus for trend analysis. Set resource requests and limits appropriate for your cluster size via Helm, and alert when components use more than 85% of their memory limit. Pay special attention to Sentry CPU spikes during large-scale deployments and Scheduler memory growth as job counts increase.
