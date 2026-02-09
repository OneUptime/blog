# How to Configure CPU Throttling Detection and Remediation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Performance, Resource Management

Description: Learn how to detect CPU throttling in Kubernetes containers, understand its impact on application performance, and implement effective remediation strategies.

---

CPU throttling silently degrades application performance. Your containers request 500 millicores but get throttled even when the node has spare capacity. Response times increase, batch jobs take longer, and users complain about slow services. Understanding and fixing CPU throttling is essential for maintaining application performance.

Kubernetes throttles containers when they exceed their CPU quota within a scheduling period. The default CFS (Completely Fair Scheduler) period is 100ms. If your container has a limit of 1 CPU (1000 millicores), it can use 100ms of CPU time per 100ms period. Use more and you get throttled until the next period.

## Understanding CPU Throttling Metrics

The kubelet exposes throttling metrics through cAdvisor. The key metrics are:

**container_cpu_cfs_throttled_periods_total**: Count of periods where the container was throttled
**container_cpu_cfs_periods_total**: Total count of elapsed CFS periods
**container_cpu_cfs_throttled_seconds_total**: Total time the container was throttled

The throttling ratio tells you how often throttling occurs:

```promql
# Throttling ratio (0 to 1, where 1 means always throttled)
rate(container_cpu_cfs_throttled_periods_total{container!=""}[5m])
/
rate(container_cpu_cfs_periods_total{container!=""}[5m])
```

A ratio above 0.1 (10% of periods throttled) indicates significant throttling that likely impacts performance.

## Detecting Throttling with Prometheus

Deploy Prometheus to collect throttling metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s

    scrape_configs:
    - job_name: 'kubernetes-cadvisor'
      kubernetes_sd_configs:
      - role: node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor
```

Create alerts for high throttling:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cpu-throttling-alerts
  namespace: monitoring
spec:
  groups:
  - name: cpu-throttling
    rules:
    - alert: HighCPUThrottling
      expr: |
        rate(container_cpu_cfs_throttled_periods_total{container!=""}[5m])
        /
        rate(container_cpu_cfs_periods_total{container!=""}[5m])
        > 0.25
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Container {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }} experiencing high CPU throttling"
        description: "Throttled {{ $value | humanizePercentage }} of the time"

    - alert: SevereCPUThrottling
      expr: |
        rate(container_cpu_cfs_throttled_periods_total{container!=""}[5m])
        /
        rate(container_cpu_cfs_periods_total{container!=""}[5m])
        > 0.5
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Container {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }} severely throttled"
        description: "Throttled {{ $value | humanizePercentage }} of the time - performance severely impacted"
```

## Analyzing Throttling Patterns

Not all throttling is problematic. Brief throttling during startup or occasional bursts is normal. Sustained throttling indicates a problem.

Query Prometheus to identify consistently throttled containers:

```promql
# Containers with sustained throttling over 24 hours
avg_over_time(
  (rate(container_cpu_cfs_throttled_periods_total{container!=""}[5m])
  /
  rate(container_cpu_cfs_periods_total{container!=""}[5m]))[24h:5m]
) > 0.1
```

Compare throttling against node CPU availability:

```promql
# Throttling when node has spare capacity
(
  rate(container_cpu_cfs_throttled_periods_total{container!=""}[5m])
  /
  rate(container_cpu_cfs_periods_total{container!=""}[5m])
  > 0.1
)
and on(node)
(
  1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (node) < 0.7
)
```

This identifies containers being throttled even when their nodes have over 30% idle CPU - a clear sign of misconfigured limits.

## Fixing Throttling by Increasing Limits

The most direct fix is increasing CPU limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: web-app:latest
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"  # Increased from 1000m
            memory: "1Gi"
```

The increased limit allows the container to burst higher without throttling. However, this isn't always the right solution - it increases the pod's resource footprint and might cause scheduling issues.

## Removing CPU Limits Entirely

For some workloads, removing CPU limits is better than constantly tuning them:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  template:
    spec:
      containers:
      - name: processor
        image: batch-processor:latest
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            memory: "4Gi"
            # No CPU limit - can use spare node capacity
```

Without a CPU limit, the container can use any available CPU on the node. The request ensures it gets guaranteed CPU, but it won't be throttled when bursting above that level if capacity exists.

This works well for:
- Batch processing jobs that benefit from faster completion
- Services with unpredictable CPU patterns
- Non-critical workloads that can share spare capacity

Don't remove limits for:
- High-priority production services (they could monopolize CPU)
- Workloads sharing nodes with latency-sensitive applications
- Containers that might runaway and consume excessive resources

## Using Burstable QoS Strategically

Kubernetes assigns QoS classes based on resource configuration:

**Guaranteed**: Requests equal limits for all resources
**Burstable**: Requests are less than limits, or limits aren't set
**BestEffort**: No requests or limits set

Burstable pods with CPU requests but no limits get guaranteed baseline CPU but can burst without throttling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        image: api-server:latest
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            memory: "4Gi"
            # CPU limit omitted for burstable behavior
      priorityClassName: high-priority
```

Use priorityClassName to ensure critical workloads aren't evicted during resource pressure.

## Adjusting CFS Quota Period

In some cases, throttling occurs because burst patterns don't align with the 100ms CFS period. Kubernetes doesn't expose this setting at the pod level, but you can adjust it node-wide through kubelet configuration.

Edit kubelet configuration:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cpuCFSQuota: true
cpuCFSQuotaPeriod: "100ms"  # Default
# Increasing to 200ms reduces throttling granularity
# cpuCFSQuotaPeriod: "200ms"
```

Restart the kubelet after changes:

```bash
systemctl restart kubelet
```

Increasing the period allows longer bursts but reduces scheduling fairness. This is an advanced tuning option with tradeoffs.

## Implementing Automated Limit Adjustment

Use VPA (Vertical Pod Autoscaler) to automatically adjust CPU limits based on actual usage:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: "500m"
        memory: "512Mi"
      maxAllowed:
        cpu: "4000m"
        memory: "8Gi"
      controlledResources: ["cpu", "memory"]
      mode: Auto
```

VPA monitors throttling and adjusts limits to prevent it while staying within bounds you configure.

## Building a Throttling Dashboard

Create a Grafana dashboard for throttling visibility:

```json
{
  "dashboard": {
    "title": "CPU Throttling Analysis",
    "panels": [
      {
        "title": "Throttling Rate by Container",
        "targets": [
          {
            "expr": "topk(10, rate(container_cpu_cfs_throttled_periods_total{container!=\"\"}[5m]) / rate(container_cpu_cfs_periods_total{container!=\"\"}[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Total Throttled Time",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_cfs_throttled_seconds_total{container!=\"\"}[5m])) by (namespace, pod, container)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "CPU Usage vs Limit",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total{container!=\"\"}[5m])",
            "legendFormat": "Usage - {{ namespace }}/{{ pod }}"
          },
          {
            "expr": "kube_pod_container_resource_limits{resource=\"cpu\"}",
            "legendFormat": "Limit - {{ namespace }}/{{ pod }}"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## Testing Throttling Impact

Quantify the performance impact of throttling with load tests:

```bash
# Deploy test workload with known throttling
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: throttle-test
spec:
  containers:
  - name: cpu-stress
    image: polinux/stress
    command: ["stress"]
    args: ["--cpu", "2", "--timeout", "300s"]
    resources:
      requests:
        cpu: "500m"
      limits:
        cpu: "1000m"  # Will throttle with 2 CPU stress threads
EOF

# Monitor throttling during test
watch -n 1 'kubectl exec -it prometheus-pod -n monitoring -- promtool query instant \
  "rate(container_cpu_cfs_throttled_periods_total{pod=\"throttle-test\"}[1m]) / \
   rate(container_cpu_cfs_periods_total{pod=\"throttle-test\"}[1m])"'

# Compare completion time with and without limits
```

## Best Practices

**Monitor throttling as a key metric**: Include it in SLOs and dashboards
**Set limits based on burst needs**: Not just average usage
**Use requests for scheduling**: Not limits
**Test under load**: Understand throttling behavior before production
**Consider removing limits**: For workloads that can safely burst
**Use VPA for dynamic adjustment**: Don't manually tune hundreds of deployments

## Conclusion

CPU throttling degrades performance in ways that aren't obvious from CPU usage metrics alone. By monitoring throttling metrics, understanding when throttling is acceptable versus problematic, and implementing appropriate remediation strategies - whether increasing limits, removing them entirely, or using VPA for dynamic adjustment - you ensure applications get the CPU they need to perform well. The key is measuring actual throttling impact and making data-driven decisions about resource configuration rather than relying on defaults or guesswork.
