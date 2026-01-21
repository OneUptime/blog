# How to Upgrade Loki Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Upgrade, Zero Downtime, Rolling Update, Migration, Operations

Description: A comprehensive guide to upgrading Grafana Loki without downtime, covering rolling upgrade strategies, version compatibility, configuration migration, and best practices for production deployments.

---

Upgrading Loki in production requires careful planning to avoid data loss and service interruption. This guide covers strategies for performing zero-downtime upgrades of Loki deployments.

## Prerequisites

Before starting, ensure you have:

- Loki deployed in HA mode (required for zero-downtime)
- Understanding of your current Loki version
- Backup of configuration and data
- Test environment for validation

## Pre-Upgrade Checklist

### 1. Review Release Notes

```bash
# Check current version
curl http://loki:3100/ready

# Review upgrade notes
# https://grafana.com/docs/loki/latest/upgrading/
```

### 2. Check Configuration Compatibility

```bash
# Validate configuration against new version
docker run grafana/loki:NEW_VERSION \
  -config.file=/path/to/config.yaml \
  -verify-config
```

### 3. Backup Critical Data

```bash
# Export rules
curl http://loki:3100/loki/api/v1/rules > rules-backup.yaml

# Backup configuration
cp /etc/loki/config.yaml config-backup.yaml

# If using filesystem storage, backup data
# For object storage, ensure retention policies are in place
```

### 4. Verify HA Setup

```bash
# Check ring status
curl http://loki:3100/ring

# Verify replication factor
# Should be >= 2 for zero-downtime upgrade
```

## Rolling Upgrade Strategy

### Upgrade Order

For microservices mode:

1. **Compactor** - Single instance, coordinate carefully
2. **Query Frontend** - Stateless, easy to upgrade
3. **Query Scheduler** - Stateless, easy to upgrade
4. **Queriers** - Stateless, one at a time
5. **Distributors** - Stateless, one at a time
6. **Ingesters** - Stateful, most critical

### Kubernetes Rolling Update

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-distributor
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
        - name: distributor
          image: grafana/loki:2.9.4  # New version
```

### Helm Upgrade

```bash
# Update Helm values
helm upgrade loki grafana/loki \
  --namespace loki \
  --set image.tag=2.9.4 \
  --wait \
  --timeout 10m

# For gradual rollout
helm upgrade loki grafana/loki \
  --namespace loki \
  --set image.tag=2.9.4 \
  --set distributor.replicas=3 \
  --atomic
```

## Ingester Upgrade Procedure

### Graceful Shutdown

```yaml
ingester:
  lifecycler:
    final_sleep: 30s  # Allow time for handoff

# Kubernetes configuration
spec:
  terminationGracePeriodSeconds: 300
```

### Step-by-Step Ingester Upgrade

```bash
# 1. Check ring health
curl http://loki:3100/ring

# 2. Upgrade one ingester at a time
kubectl set image statefulset/loki-ingester \
  ingester=grafana/loki:2.9.4 \
  --namespace loki

# 3. Wait for pod to be ready
kubectl rollout status statefulset/loki-ingester \
  --namespace loki \
  --timeout=10m

# 4. Verify ring recovery
curl http://loki:3100/ring

# 5. Verify no data loss
# Query recent logs to confirm
```

### WAL Recovery Verification

```bash
# Check WAL replay
kubectl logs -n loki loki-ingester-0 | grep -i wal

# Verify streams recovered
curl http://loki:3100/metrics | grep loki_ingester_memory_streams
```

## Configuration Migration

### Version-Specific Changes

```yaml
# Example: Migrating from 2.8 to 2.9

# Old configuration (2.8)
storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: s3

# New configuration (2.9)
storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    shared_store: s3

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h
```

### Schema Migration

```yaml
# Support multiple schemas during migration
schema_config:
  configs:
    # Old schema for historical data
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: s3
      schema: v12
      index:
        prefix: loki_index_
        period: 24h

    # New schema for new data
    - from: 2024-06-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_tsdb_
        period: 24h
```

## Blue-Green Deployment

### Deploy New Version Alongside

```yaml
# New deployment with different name
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-distributor-v2
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: distributor
          image: grafana/loki:2.9.4
```

### Traffic Switching

```yaml
# Service pointing to both versions
apiVersion: v1
kind: Service
metadata:
  name: loki-distributor
spec:
  selector:
    app.kubernetes.io/name: loki-distributor
    # Remove version selector to target both
```

### Gradual Traffic Shift

```yaml
# Using Istio for traffic splitting
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: loki-distributor
spec:
  hosts:
    - loki-distributor
  http:
    - route:
        - destination:
            host: loki-distributor-v1
          weight: 80
        - destination:
            host: loki-distributor-v2
          weight: 20
```

## Canary Deployment

### Deploy Canary Ingester

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-ingester-canary
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: loki-ingester
        version: canary
    spec:
      containers:
        - name: ingester
          image: grafana/loki:2.9.4
```

### Monitor Canary

```promql
# Error rate comparison
sum(rate(loki_request_duration_seconds_count{status_code=~"5..", version="canary"}[5m]))
/
sum(rate(loki_request_duration_seconds_count{version="canary"}[5m]))

# Latency comparison
histogram_quantile(0.99,
  sum by (le, version) (
    rate(loki_request_duration_seconds_bucket[5m])
  )
)
```

## Rollback Procedures

### Quick Rollback

```bash
# Kubernetes deployment rollback
kubectl rollout undo deployment/loki-distributor -n loki
kubectl rollout undo deployment/loki-querier -n loki
kubectl rollout undo statefulset/loki-ingester -n loki

# Helm rollback
helm rollback loki -n loki
```

### Verify Rollback

```bash
# Check versions
kubectl get pods -n loki -o jsonpath='{.items[*].spec.containers[*].image}'

# Verify ring health
curl http://loki:3100/ring

# Test queries
curl -G http://loki:3100/loki/api/v1/query \
  --data-urlencode 'query={job="test"}'
```

## Monitoring During Upgrade

### Key Metrics to Watch

```promql
# Ingestion errors
sum(rate(loki_distributor_ingester_append_failures_total[5m]))

# Query errors
sum(rate(loki_request_duration_seconds_count{status_code=~"5.."}[5m]))

# Ring health
count(cortex_ring_members{state="ACTIVE", name="ingester"})

# WAL replay progress
loki_ingester_wal_replay_active
```

### Upgrade Dashboard

```json
{
  "title": "Loki Upgrade Monitoring",
  "panels": [
    {
      "title": "Pod Versions",
      "type": "table",
      "targets": [{
        "expr": "count by (image) (kube_pod_container_info{container='ingester'})"
      }]
    },
    {
      "title": "Ring Members",
      "type": "stat",
      "targets": [{
        "expr": "count(cortex_ring_members{state='ACTIVE', name='ingester'})"
      }]
    },
    {
      "title": "Error Rate",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(loki_request_duration_seconds_count{status_code=~'5..'}[5m]))"
      }]
    }
  ]
}
```

## Post-Upgrade Validation

### Functional Tests

```bash
# Test write path
curl -X POST "http://loki:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"test":"upgrade"},"values":[["'"$(date +%s)"'000000000","Upgrade test"]]}]}'

# Test read path
curl -G "http://loki:3100/loki/api/v1/query" \
  --data-urlencode 'query={test="upgrade"}'

# Test tail
curl "http://loki:3100/loki/api/v1/tail?query={job='test'}"
```

### Performance Comparison

```promql
# Compare latency before/after
histogram_quantile(0.99,
  sum by (le) (
    rate(loki_request_duration_seconds_bucket{route="/loki/api/v1/push"}[5m])
  )
)
```

## Best Practices

### Do's

1. Read release notes thoroughly
2. Test in staging first
3. Upgrade during low-traffic periods
4. Monitor closely during upgrade
5. Have rollback plan ready
6. Keep backups

### Don'ts

1. Skip versions (check migration path)
2. Upgrade all components simultaneously
3. Ignore deprecation warnings
4. Rush the process

## Conclusion

Zero-downtime Loki upgrades require careful planning and execution. Key takeaways:

- Follow proper upgrade order
- Use rolling updates for gradual rollout
- Monitor closely during upgrade
- Have rollback procedures ready
- Test thoroughly before and after
- Use HA configuration for zero-downtime

With proper preparation, you can upgrade Loki safely while maintaining continuous log collection and querying.
