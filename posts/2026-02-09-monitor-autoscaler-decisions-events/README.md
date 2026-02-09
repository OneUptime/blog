# How to Monitor Autoscaler Decisions with Kubernetes Events and Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, Autoscaling

Description: Learn how to effectively monitor and track autoscaling decisions using Kubernetes events, metrics, and observability tools to understand scaling behavior and troubleshoot issues.

---

Autoscalers make critical decisions about resource allocation, but these decisions often happen invisibly. Monitoring autoscaler behavior helps you understand why scaling occurred, verify it matches expectations, and troubleshoot when it doesn't. Kubernetes provides events and metrics to track autoscaling decisions.

## Understanding Kubernetes Events for Autoscaling

Kubernetes generates events when autoscalers make decisions. View events for an HPA:

```bash
kubectl describe hpa webapp-hpa -n production
```

Events section shows scaling history:

```
Events:
  Type    Reason             Age    From                       Message
  ----    ------             ----   ----                       -------
  Normal  SuccessfulRescale  5m     horizontal-pod-autoscaler  New size: 8; reason: cpu resource utilization (percentage of request) above target
  Normal  SuccessfulRescale  12m    horizontal-pod-autoscaler  New size: 5; reason: All metrics below target
  Warning FailedGetScale     15m    horizontal-pod-autoscaler  deployments/scale.apps "webapp" not found
```

Event types:

- **SuccessfulRescale**: Scaling completed successfully
- **FailedGetScale**: Cannot find target resource
- **FailedComputeMetricsReplicas**: Error calculating desired replicas
- **FailedGetResourceMetric**: Cannot retrieve metrics from Metrics Server

## Viewing Events with kubectl

Get recent events for all HPAs:

```bash
kubectl get events --all-namespaces \
  --field-selector involvedObject.kind=HorizontalPodAutoscaler \
  --sort-by='.lastTimestamp'
```

Filter to specific HPA:

```bash
kubectl get events -n production \
  --field-selector involvedObject.name=webapp-hpa \
  --sort-by='.lastTimestamp'
```

Watch events in real-time:

```bash
kubectl get events -n production -w
```

## Exporting Events to Prometheus

Events are ephemeral (retained for 1 hour by default). Export them to Prometheus for long-term storage:

Deploy kubernetes-event-exporter:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: event-exporter
  template:
    metadata:
      labels:
        app: event-exporter
    spec:
      serviceAccountName: event-exporter
      containers:
      - name: event-exporter
        image: ghcr.io/resmoio/kubernetes-event-exporter:v1.4
        args:
        - -conf=/config/config.yaml
        volumeMounts:
        - name: config
          mountPath: /config
      volumes:
      - name: config
        configMap:
          name: event-exporter-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-exporter-config
  namespace: monitoring
data:
  config.yaml: |
    logLevel: info
    logFormat: json
    receivers:
    - name: prometheus
      webhook:
        endpoint: "http://prometheus-pushgateway:9091/metrics/job/kubernetes-events"
    route:
      routes:
      - match:
        - receiver: prometheus
          involvedObject:
            kind: HorizontalPodAutoscaler
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: event-exporter
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: event-exporter
rules:
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: event-exporter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: event-exporter
subjects:
- kind: ServiceAccount
  name: event-exporter
  namespace: monitoring
```

## Monitoring HPA Metrics

HPA status contains current metric values. Query it programmatically:

```bash
kubectl get hpa webapp-hpa -o jsonpath='{.status.currentMetrics[*]}' | jq
```

Output shows current state:

```json
{
  "type": "Resource",
  "resource": {
    "name": "cpu",
    "current": {
      "averageUtilization": 65,
      "averageValue": "650m"
    }
  }
}
```

Get desired vs current replicas:

```bash
kubectl get hpa webapp-hpa -o custom-columns=\
NAME:.metadata.name,\
CURRENT:.status.currentReplicas,\
DESIRED:.status.desiredReplicas,\
MIN:.spec.minReplicas,\
MAX:.spec.maxReplicas
```

## Using kube-state-metrics for Prometheus

kube-state-metrics exposes HPA state as Prometheus metrics. Install it:

```bash
helm install kube-state-metrics prometheus-community/kube-state-metrics \
  --namespace monitoring \
  --set prometheus.monitor.enabled=true
```

Query HPA metrics in Prometheus:

```promql
# Current replica count
kube_horizontalpodautoscaler_status_current_replicas{
  horizontalpodautoscaler="webapp-hpa"
}

# Desired replica count
kube_horizontalpodautoscaler_status_desired_replicas{
  horizontalpodautoscaler="webapp-hpa"
}

# Min/max configuration
kube_horizontalpodautoscaler_spec_min_replicas{
  horizontalpodautoscaler="webapp-hpa"
}

kube_horizontalpodautoscaler_spec_max_replicas{
  horizontalpodautoscaler="webapp-hpa"
}

# Metric values
kube_horizontalpodautoscaler_status_condition{
  horizontalpodautoscaler="webapp-hpa",
  condition="ScalingActive"
}
```

## Building Autoscaling Dashboards

Create a Grafana dashboard to visualize autoscaling:

```json
{
  "dashboard": {
    "title": "HPA Monitoring",
    "panels": [
      {
        "title": "Replica Count",
        "targets": [
          {
            "expr": "kube_horizontalpodautoscaler_status_current_replicas{namespace=\"production\"}",
            "legendFormat": "{{ horizontalpodautoscaler }} - Current"
          },
          {
            "expr": "kube_horizontalpodautoscaler_status_desired_replicas{namespace=\"production\"}",
            "legendFormat": "{{ horizontalpodautoscaler }} - Desired"
          }
        ],
        "type": "graph"
      },
      {
        "title": "CPU Utilization vs Target",
        "targets": [
          {
            "expr": "avg(rate(container_cpu_usage_seconds_total{namespace=\"production\",pod=~\"webapp-.*\"}[5m])) / avg(kube_pod_container_resource_requests{namespace=\"production\",pod=~\"webapp-.*\",resource=\"cpu\"}) * 100",
            "legendFormat": "Current CPU %"
          },
          {
            "expr": "kube_horizontalpodautoscaler_spec_target_metric{namespace=\"production\",horizontalpodautoscaler=\"webapp-hpa\",metric_name=\"cpu\"} * 100",
            "legendFormat": "Target CPU %"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Scaling Events",
        "targets": [
          {
            "expr": "increase(kube_horizontalpodautoscaler_status_current_replicas{namespace=\"production\"}[1m])",
            "legendFormat": "{{ horizontalpodautoscaler }}"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## Alerting on Autoscaling Issues

Create Prometheus alerts for autoscaling problems:

```yaml
groups:
- name: autoscaling
  rules:
  # Alert when HPA is at max replicas
  - alert: HPAMaxedOut
    expr: |
      kube_horizontalpodautoscaler_status_current_replicas
      == kube_horizontalpodautoscaler_spec_max_replicas
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "HPA {{ $labels.horizontalpodautoscaler }} at maximum replicas"
      description: "HPA has been at max replicas for 15 minutes. Consider increasing maxReplicas or investigating load."

  # Alert when HPA cannot get metrics
  - alert: HPAMetricsUnavailable
    expr: |
      kube_horizontalpodautoscaler_status_condition{
        condition="ScalingActive",
        status="false"
      } == 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "HPA {{ $labels.horizontalpodautoscaler }} cannot retrieve metrics"
      description: "HPA scaling is inactive due to missing metrics. Check Metrics Server."

  # Alert on frequent scaling
  - alert: HPAFlapping
    expr: |
      rate(kube_horizontalpodautoscaler_status_current_replicas[10m]) > 0.5
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "HPA {{ $labels.horizontalpodautoscaler }} scaling too frequently"
      description: "Replica count changing more than 5 times per 10 minutes. Check stabilization windows."

  # Alert when metrics unavailable
  - alert: HPAMetricNotFound
    expr: |
      kube_horizontalpodautoscaler_status_condition{
        condition="AbleToScale",
        status="false",
        reason="FailedGetResourceMetric"
      } == 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "HPA {{ $labels.horizontalpodautoscaler }} cannot find metric"
      description: "HPA cannot retrieve metric {{ $labels.metric_name }}. Check metric configuration."
```

## Monitoring Cluster Autoscaler

Cluster Autoscaler has its own metrics endpoint. Create a ServiceMonitor:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    app: cluster-autoscaler
spec:
  selector:
    app: cluster-autoscaler
  ports:
  - name: metrics
    port: 8085
    targetPort: 8085
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: cluster-autoscaler
  endpoints:
  - port: metrics
    interval: 30s
```

Query Cluster Autoscaler metrics:

```promql
# Pending pods (trigger for scale-up)
cluster_autoscaler_unschedulable_pods_count

# Node group size
cluster_autoscaler_nodes_count{state="ready"}

# Scale-up events
rate(cluster_autoscaler_scaled_up_nodes_total[10m])

# Scale-down events
rate(cluster_autoscaler_scaled_down_nodes_total[10m])

# Failed scale operations
cluster_autoscaler_failed_scale_ups_total
```

## Tracking VPA Recommendations

Vertical Pod Autoscaler generates recommendations. Check them:

```bash
kubectl describe vpa webapp-vpa -n production
```

Output includes recommendations:

```yaml
Recommendation:
  Container Recommendations:
  - Container Name: webapp
    Lower Bound:
      Cpu: 100m
      Memory: 256Mi
    Target:
      Cpu: 500m
      Memory: 1Gi
    Uncapped Target:
      Cpu: 800m
      Memory: 1.5Gi
    Upper Bound:
      Cpu: 2
      Memory: 4Gi
```

VPA doesn't expose Prometheus metrics natively. Use a custom exporter or query the VPA API:

```python
# vpa_exporter.py
from kubernetes import client, config
from prometheus_client import start_http_server, Gauge
import time

config.load_incluster_config()
custom_api = client.CustomObjectsApi()

vpa_target_cpu = Gauge('vpa_recommendation_target_cpu_cores',
                       'VPA CPU target recommendation',
                       ['namespace', 'vpa', 'container'])
vpa_target_memory = Gauge('vpa_recommendation_target_memory_bytes',
                          'VPA memory target recommendation',
                          ['namespace', 'vpa', 'container'])

def collect_vpa_metrics():
    vpas = custom_api.list_cluster_custom_object(
        group="autoscaling.k8s.io",
        version="v1",
        plural="verticalpodautoscalers"
    )

    for vpa in vpas['items']:
        namespace = vpa['metadata']['namespace']
        name = vpa['metadata']['name']

        if 'recommendation' in vpa.get('status', {}):
            for container in vpa['status']['recommendation']['containerRecommendations']:
                container_name = container['containerName']
                target = container.get('target', {})

                if 'cpu' in target:
                    cpu_cores = parse_cpu(target['cpu'])
                    vpa_target_cpu.labels(namespace, name, container_name).set(cpu_cores)

                if 'memory' in target:
                    memory_bytes = parse_memory(target['memory'])
                    vpa_target_memory.labels(namespace, name, container_name).set(memory_bytes)

def parse_cpu(cpu_str):
    if cpu_str.endswith('m'):
        return float(cpu_str[:-1]) / 1000
    return float(cpu_str)

def parse_memory(mem_str):
    units = {'Ki': 1024, 'Mi': 1024**2, 'Gi': 1024**3}
    for suffix, multiplier in units.items():
        if mem_str.endswith(suffix):
            return float(mem_str[:-2]) * multiplier
    return float(mem_str)

if __name__ == '__main__':
    start_http_server(8000)
    while True:
        collect_vpa_metrics()
        time.sleep(30)
```

## Best Practices

**Retain events for analysis**: Export events to external storage (Elasticsearch, Loki) for long-term retention. Default 1-hour retention isn't enough for root cause analysis.

**Create dashboards before problems occur**: Build monitoring dashboards during normal operation so you understand baseline behavior when investigating issues.

**Alert on sustained max replicas**: Brief periods at max replicas are normal. Alert when sustained for 15+ minutes, indicating capacity limits.

**Track scaling frequency**: Calculate how often replica count changes. High frequency (>10 changes per hour) suggests tuning is needed.

```promql
# Scaling events per hour
rate(kube_horizontalpodautoscaler_status_current_replicas[1h]) * 3600
```

**Monitor metric collection lag**: Track time between metric collection and scaling decision:

```promql
# Time since last scale
time() - kube_horizontalpodautoscaler_status_last_scale_time
```

**Correlate autoscaling with application metrics**: When investigating scaling issues, compare HPA decisions with application metrics (latency, error rate) to verify scaling helped.

Effective monitoring transforms autoscaling from a black box into an observable, debuggable system. By tracking events, metrics, and decisions, you gain confidence that autoscaling behaves as intended and can quickly diagnose when it doesn't.
