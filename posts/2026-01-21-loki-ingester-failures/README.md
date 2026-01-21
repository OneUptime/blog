# How to Handle Loki Ingester Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Ingester, Failure Recovery, WAL, High Availability, Disaster Recovery

Description: A comprehensive guide to handling Grafana Loki ingester failures, covering WAL recovery, data replication, failure scenarios, and operational procedures for maintaining data durability.

---

Ingesters are the most critical stateful component in Loki. Understanding how to handle ingester failures is essential for maintaining data durability and availability. This guide covers failure scenarios, recovery procedures, and best practices.

## Prerequisites

Before starting, ensure you have:

- Loki deployed with HA configuration
- WAL enabled for ingesters
- Understanding of Loki's replication model
- Monitoring configured for ingesters

## Understanding Ingester Architecture

### Ingester Responsibilities

1. Receive log entries from distributors
2. Build chunks in memory
3. Write to WAL for durability
4. Flush chunks to object storage
5. Serve recent data for queries

### Data Flow

```
Distributor -> Ingester (Memory + WAL) -> Object Storage
                    |
              Replication to N ingesters
```

### State Management

| State | Location | Durability |
|-------|----------|------------|
| In-memory chunks | RAM | Lost on crash |
| WAL | Local disk | Survives restart |
| Flushed chunks | Object storage | Permanent |

## Write-Ahead Log (WAL)

### WAL Configuration

```yaml
ingester:
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 4GB
    flush_on_shutdown: true
    checkpoint_duration: 5m
```

### How WAL Works

1. Log entries written to WAL before acknowledgment
2. WAL replayed on startup
3. Checkpoints reduce replay time
4. WAL segments deleted after flush

### WAL Best Practices

```yaml
ingester:
  wal:
    enabled: true
    dir: /loki/wal

    # Memory limit for replay
    replay_memory_ceiling: 4GB

    # Flush before shutdown
    flush_on_shutdown: true

    # Checkpoint interval
    checkpoint_duration: 5m
```

## Failure Scenarios

### Scenario 1: Single Ingester Crash

**Impact**: Minimal with proper replication

**Recovery**:
1. Ring detects failure
2. Tokens redistributed
3. Pod restarts, WAL replays
4. Ingester rejoins ring

```bash
# Monitor recovery
kubectl get pods -n loki -w
curl http://loki:3100/ring
```

### Scenario 2: Multiple Ingester Failures

**Impact**: Potential data loss if > (replication_factor - 1) fail

**Recovery**:
```bash
# Check ring status
curl http://loki:3100/ring

# Scale up replacements
kubectl scale statefulset/loki-ingester --replicas=6 -n loki

# Wait for recovery
kubectl rollout status statefulset/loki-ingester -n loki
```

### Scenario 3: WAL Corruption

**Impact**: Data loss for affected ingester

**Recovery**:
```bash
# Clear corrupted WAL
kubectl exec -n loki loki-ingester-0 -- rm -rf /loki/wal/*

# Restart ingester
kubectl delete pod -n loki loki-ingester-0

# Verify recovery
kubectl logs -n loki loki-ingester-0 | grep -i wal
```

### Scenario 4: Storage Failure

**Impact**: All ingesters affected

**Recovery**:
1. Restore storage from backup
2. Restart all ingesters
3. Verify ring health

## Replication Configuration

### Replication Factor

```yaml
common:
  replication_factor: 3

ingester:
  lifecycler:
    ring:
      replication_factor: 3
```

### Quorum Writes

With replication_factor=3:
- Writes succeed with 2 acks (quorum)
- Can tolerate 1 ingester failure
- 2 failures may cause write errors

### Zone-Aware Replication

```yaml
common:
  replication_factor: 3
  ring:
    zone_awareness_enabled: true

ingester:
  lifecycler:
    availability_zone: ${ZONE}
```

## Graceful Shutdown

### Configuration

```yaml
ingester:
  lifecycler:
    final_sleep: 30s  # Time to transfer data
```

### Kubernetes Configuration

```yaml
spec:
  terminationGracePeriodSeconds: 300
  containers:
    - name: ingester
      lifecycle:
        preStop:
          exec:
            command:
              - /bin/sh
              - -c
              - sleep 30 && kill -SIGTERM 1
```

### Shutdown Procedure

1. Pod receives SIGTERM
2. Ingester stops accepting writes
3. Flushes in-memory data to storage
4. WAL flushed if configured
5. Leaves ring gracefully
6. Pod terminates

## Monitoring Ingester Health

### Key Metrics

```promql
# Ingester state
cortex_ring_members{name="ingester", state="ACTIVE"}

# WAL replay progress
loki_ingester_wal_replay_active

# Memory usage
loki_ingester_memory_chunks

# Flush rate
rate(loki_ingester_chunks_flushed_total[5m])

# Chunk age
loki_ingester_chunk_age_seconds
```

### Alerts

```yaml
groups:
  - name: loki-ingester-alerts
    rules:
      - alert: LokiIngesterDown
        expr: |
          count(cortex_ring_members{name="ingester", state="ACTIVE"}) < 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Less than 3 active ingesters"

      - alert: LokiIngesterMemoryHigh
        expr: |
          sum by (pod) (container_memory_usage_bytes{container="ingester"})
          /
          sum by (pod) (container_spec_memory_limit_bytes{container="ingester"})
          > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Ingester memory usage over 90%"

      - alert: LokiWALReplayStuck
        expr: |
          loki_ingester_wal_replay_active == 1
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "WAL replay stuck for over 30 minutes"

      - alert: LokiIngesterFlushFailing
        expr: |
          rate(loki_ingester_chunks_flushed_total[5m]) == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Ingester not flushing chunks"
```

## Recovery Procedures

### Manual Ingester Recovery

```bash
#!/bin/bash
# recover-ingester.sh

NAMESPACE="loki"
INGESTER=$1

echo "Recovering ingester: ${INGESTER}"

# 1. Check current state
kubectl get pod -n ${NAMESPACE} ${INGESTER}

# 2. Check WAL status
kubectl exec -n ${NAMESPACE} ${INGESTER} -- ls -la /loki/wal/

# 3. If WAL corrupted, clear it
# kubectl exec -n ${NAMESPACE} ${INGESTER} -- rm -rf /loki/wal/*

# 4. Delete pod to trigger restart
kubectl delete pod -n ${NAMESPACE} ${INGESTER}

# 5. Wait for pod ready
kubectl wait --for=condition=ready pod/${INGESTER} -n ${NAMESPACE} --timeout=300s

# 6. Verify ring membership
curl http://loki-gateway.${NAMESPACE}.svc:3100/ring
```

### Force Flush Before Maintenance

```bash
# Trigger flush on all ingesters
for i in 0 1 2; do
  kubectl exec -n loki loki-ingester-$i -- \
    curl -X POST http://localhost:3100/flush
done
```

### Check Data Integrity

```bash
# Query recent logs
curl -G "http://loki:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="test"}' \
  --data-urlencode 'limit=10'

# Check ingestion is working
curl -X POST "http://loki:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"test":"recovery"},"values":[["'"$(date +%s)"'000000000","test"]]}]}'
```

## Preventing Data Loss

### Replication Best Practices

```yaml
common:
  replication_factor: 3  # Minimum 3 for production

ingester:
  lifecycler:
    ring:
      replication_factor: 3
```

### WAL Best Practices

```yaml
ingester:
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 8GB
    flush_on_shutdown: true
```

### Pod Anti-Affinity

```yaml
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: loki-ingester
          topologyKey: kubernetes.io/hostname
```

### Persistent Storage

```yaml
volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

## Testing Failure Scenarios

### Test Single Failure

```bash
# Kill one ingester
kubectl delete pod -n loki loki-ingester-0

# Monitor ring
watch -n 1 'curl -s http://loki:3100/ring | grep -c ACTIVE'

# Verify writes still work
curl -X POST "http://loki:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"test":"failure"},"values":[["'"$(date +%s)"'000000000","test"]]}]}'
```

### Test WAL Recovery

```bash
# Kill ingester without graceful shutdown
kubectl exec -n loki loki-ingester-0 -- kill -9 1

# Watch pod restart
kubectl get pods -n loki -w

# Check WAL replay
kubectl logs -n loki loki-ingester-0 | grep -i "wal replay"
```

### Chaos Engineering

```yaml
# Using Chaos Mesh
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: loki-ingester-failure
spec:
  action: pod-kill
  mode: one
  selector:
    labelSelectors:
      app: loki-ingester
  scheduler:
    cron: "@every 1h"
```

## Complete HA Configuration

```yaml
auth_enabled: true

common:
  path_prefix: /loki
  replication_factor: 3
  ring:
    kvstore:
      store: memberlist
    zone_awareness_enabled: true

memberlist:
  join_members:
    - loki-memberlist:7946

ingester:
  lifecycler:
    ring:
      kvstore:
        store: memberlist
      replication_factor: 3
    num_tokens: 128
    heartbeat_period: 5s
    heartbeat_timeout: 1m
    join_after: 30s
    observe_period: 10s
    min_ready_duration: 15s
    final_sleep: 30s
    availability_zone: ${ZONE}
  chunk_idle_period: 30m
  chunk_retain_period: 1m
  max_transfer_retries: 0
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 8GB
    flush_on_shutdown: true
    checkpoint_duration: 5m

limits_config:
  ingestion_rate_mb: 32
  ingestion_burst_size_mb: 64
  max_streams_per_user: 50000
```

## Conclusion

Handling ingester failures requires proper configuration and operational procedures. Key takeaways:

- Enable WAL for data durability
- Use replication factor of at least 3
- Configure proper pod anti-affinity
- Monitor ingester health closely
- Test failure scenarios regularly
- Have documented recovery procedures

With proper configuration, Loki can survive ingester failures without data loss.
