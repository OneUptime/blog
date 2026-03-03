# How to Monitor ArgoCD Redis Memory Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Redis, Monitoring

Description: Learn how to monitor ArgoCD Redis memory usage with Prometheus metrics, Grafana dashboards, and alerts to prevent cache evictions and performance degradation.

---

ArgoCD relies on Redis as its caching layer. The application controller, API server, and repo server all use Redis to store temporary state, application manifests, and session data. When Redis runs out of memory, ArgoCD starts behaving unpredictably - syncs fail silently, the UI becomes sluggish, and you end up chasing ghost errors that have nothing to do with your actual applications.

I have seen production ArgoCD installations grind to a halt because nobody was watching Redis memory. This guide walks you through monitoring it properly so you catch problems before they escalate.

## Why Redis Memory Matters in ArgoCD

Redis serves several critical functions in ArgoCD:

- **Application state cache**: The controller stores live and desired state comparisons
- **Manifest cache**: The repo server caches rendered manifests to avoid re-rendering on every reconciliation
- **Session tokens**: The API server stores user sessions
- **Rate limiting data**: Request throttling information

When Redis hits its memory limit, it starts evicting keys based on its eviction policy. In ArgoCD's case, this means cached manifests get dropped, forcing the repo server to re-render everything. This creates a cascading effect where the repo server CPU spikes, reconciliation slows down, and the entire system struggles.

## Checking Redis Memory Directly

Before setting up monitoring, you can check current Redis memory usage with a quick command:

```bash
# Connect to the ArgoCD Redis pod and check memory stats
kubectl exec -n argocd deploy/argocd-redis -- redis-cli INFO memory
```

This returns output like:

```text
used_memory:48293216
used_memory_human:46.06M
used_memory_rss:55410688
used_memory_rss_human:52.85M
used_memory_peak:71528320
used_memory_peak_human:68.21M
maxmemory:0
maxmemory_human:0B
maxmemory_policy:noeviction
mem_fragmentation_ratio:1.15
```

Key values to pay attention to:

- **used_memory**: Actual memory used by Redis
- **used_memory_rss**: Memory as reported by the OS (includes fragmentation)
- **maxmemory**: The configured memory limit (0 means unlimited)
- **mem_fragmentation_ratio**: RSS divided by used_memory. Values above 1.5 indicate significant fragmentation

## Exposing Redis Metrics to Prometheus

ArgoCD Redis does not expose Prometheus metrics natively. You need a Redis exporter sidecar. The most common approach is to use the `oliver006/redis_exporter` image.

If you are using the ArgoCD Helm chart, you can enable the Redis exporter in your values file:

```yaml
# values.yaml for ArgoCD Helm chart
redis:
  metrics:
    enabled: true
    image:
      repository: oliver006/redis_exporter
      tag: v1.58.0
    serviceMonitor:
      enabled: true
      namespace: argocd
      interval: 30s
    resources:
      requests:
        cpu: 10m
        memory: 32Mi
      limits:
        cpu: 100m
        memory: 64Mi
```

If you installed ArgoCD with plain manifests, add the exporter as a sidecar to the Redis deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-redis
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: redis
          image: redis:7.0.15-alpine
          ports:
            - containerPort: 6379
          args:
            - --save ""
            - --appendonly no
            - --maxmemory 256mb
            - --maxmemory-policy allkeys-lru
        - name: redis-exporter
          image: oliver006/redis_exporter:v1.58.0
          ports:
            - containerPort: 9121
              name: metrics
          env:
            - name: REDIS_ADDR
              value: "redis://localhost:6379"
          resources:
            requests:
              cpu: 10m
              memory: 32Mi
            limits:
              cpu: 100m
              memory: 64Mi
```

You also need a Service and ServiceMonitor to let Prometheus discover the metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: argocd-redis-metrics
  namespace: argocd
  labels:
    app.kubernetes.io/component: redis
    app.kubernetes.io/part-of: argocd
spec:
  ports:
    - port: 9121
      targetPort: metrics
      name: metrics
  selector:
    app.kubernetes.io/name: argocd-redis
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-redis
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: redis
      app.kubernetes.io/part-of: argocd
  endpoints:
    - port: metrics
      interval: 30s
```

## Key Prometheus Metrics to Track

Once the exporter is running, you get access to dozens of Redis metrics. Here are the ones that matter most for ArgoCD:

```promql
# Current memory usage in bytes
redis_memory_used_bytes

# Peak memory usage
redis_memory_max_bytes

# Memory fragmentation ratio
redis_memory_fragmentation_ratio

# Number of evicted keys (should be 0 in healthy state)
redis_evicted_keys_total

# Number of keys in each database
redis_db_keys{db="db0"}

# Connected clients
redis_connected_clients

# Commands processed per second
redis_commands_processed_total

# Keyspace hit/miss ratio
redis_keyspace_hits_total
redis_keyspace_misses_total
```

The cache hit ratio is particularly important for ArgoCD performance:

```promql
# Cache hit ratio - should be above 90%
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

## Building a Grafana Dashboard

Here is a practical Grafana dashboard configuration with the panels that matter most for ArgoCD Redis monitoring:

```json
{
  "panels": [
    {
      "title": "Redis Memory Usage",
      "type": "timeseries",
      "targets": [
        {
          "expr": "redis_memory_used_bytes{namespace=\"argocd\"}",
          "legendFormat": "Used Memory"
        },
        {
          "expr": "redis_memory_max_bytes{namespace=\"argocd\"}",
          "legendFormat": "Max Memory"
        }
      ]
    },
    {
      "title": "Memory Fragmentation Ratio",
      "type": "stat",
      "targets": [
        {
          "expr": "redis_memory_fragmentation_ratio{namespace=\"argocd\"}"
        }
      ],
      "thresholds": {
        "steps": [
          {"value": 0, "color": "green"},
          {"value": 1.5, "color": "yellow"},
          {"value": 2.0, "color": "red"}
        ]
      }
    },
    {
      "title": "Evicted Keys",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(redis_evicted_keys_total{namespace=\"argocd\"}[5m])",
          "legendFormat": "Evictions/sec"
        }
      ]
    },
    {
      "title": "Cache Hit Ratio",
      "type": "gauge",
      "targets": [
        {
          "expr": "rate(redis_keyspace_hits_total{namespace=\"argocd\"}[5m]) / (rate(redis_keyspace_hits_total{namespace=\"argocd\"}[5m]) + rate(redis_keyspace_misses_total{namespace=\"argocd\"}[5m]))"
        }
      ]
    }
  ]
}
```

## Setting Up Alerts

Create PrometheusRule resources to alert on Redis memory problems before they cause issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-redis-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-redis
      rules:
        # Alert when Redis memory usage exceeds 80% of limit
        - alert: ArgoCDRedisHighMemoryUsage
          expr: |
            redis_memory_used_bytes{namespace="argocd"} /
            redis_memory_max_bytes{namespace="argocd"} > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD Redis memory usage above 80%"
            description: "Redis is using {{ $value | humanizePercentage }} of available memory"

        # Alert when keys are being evicted
        - alert: ArgoCDRedisEvictions
          expr: |
            rate(redis_evicted_keys_total{namespace="argocd"}[5m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD Redis is evicting keys"
            description: "Key evictions indicate Redis has hit its memory limit"

        # Alert on high fragmentation
        - alert: ArgoCDRedisHighFragmentation
          expr: |
            redis_memory_fragmentation_ratio{namespace="argocd"} > 2.0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD Redis memory fragmentation is high"
            description: "Fragmentation ratio is {{ $value }}, consider restarting Redis"

        # Alert when cache hit ratio drops
        - alert: ArgoCDRedisLowCacheHitRatio
          expr: |
            rate(redis_keyspace_hits_total{namespace="argocd"}[5m]) /
            (rate(redis_keyspace_hits_total{namespace="argocd"}[5m]) +
             rate(redis_keyspace_misses_total{namespace="argocd"}[5m])) < 0.8
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD Redis cache hit ratio below 80%"
```

## Setting Redis Memory Limits

You should always set a `maxmemory` limit for ArgoCD Redis. Without one, Redis can consume all available memory on the node and get OOM-killed.

For ArgoCD, configure Redis with these arguments:

```yaml
# In the Redis deployment args
args:
  - --maxmemory 256mb
  - --maxmemory-policy allkeys-lru
  - --save ""
  - --appendonly no
```

The `allkeys-lru` policy ensures that when Redis hits the memory limit, it evicts the least recently used keys rather than rejecting writes entirely. This is the right policy for a cache layer like ArgoCD uses.

Sizing guidelines based on application count:

| Applications | Recommended maxmemory |
|---|---|
| Under 100 | 128mb |
| 100 to 500 | 256mb |
| 500 to 1000 | 512mb |
| Over 1000 | 1gb+ |

## Integrating with OneUptime

For centralized monitoring, you can forward ArgoCD Redis metrics to OneUptime. Configure your Prometheus remote write to push Redis metrics, or use the OneUptime agent to scrape the Redis exporter endpoint directly. This gives you unified visibility across all your ArgoCD components alongside your application metrics. See our guide on sending ArgoCD metrics to OneUptime for the full setup.

## Troubleshooting Common Redis Memory Issues

**Memory keeps growing**: Check if `save` is enabled. ArgoCD Redis should run with `--save ""` and `--appendonly no` since it is purely a cache.

**High fragmentation**: Restart the Redis pod. Fragmentation builds up over time as keys are created and deleted. A restart resets the memory layout.

**Frequent evictions**: Increase `maxmemory` or check if the repo server cache TTL is too long. You can reduce it in the `argocd-cmd-params-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Reduce repo server cache expiration (default is 24h)
  reposerver.repo.cache.expiration: "12h"
```

Monitoring Redis memory is one of those things that feels optional until it causes an outage. Set it up once, and you will thank yourself later when you catch a memory spike before it takes down your entire deployment pipeline.
