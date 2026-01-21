# How to Set Up Loki in High Availability Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, High Availability, Replication, Distributed, Fault Tolerance, Production

Description: A comprehensive guide to setting up Grafana Loki in high availability mode, covering component replication, ring configuration, failure handling, and production deployment patterns.

---

High availability (HA) in Loki ensures your logging infrastructure remains operational even when individual components fail. This guide covers configuring Loki for HA with proper replication, ring coordination, and failure handling.

## Prerequisites

Before starting, ensure you have:

- Kubernetes cluster with multiple nodes
- Object storage (S3, GCS, Azure Blob)
- Understanding of Loki's distributed architecture
- At least 3 nodes for proper replication

## Understanding Loki HA Architecture

HA Loki requires:

1. **Multiple Replicas**: Each component runs multiple instances
2. **Ring Coordination**: Memberlist or Consul for service discovery
3. **Replication Factor**: Data written to multiple ingesters
4. **Object Storage**: Shared storage backend for chunks and indexes

## HA Configuration

### Core HA Settings

```yaml
auth_enabled: true

common:
  path_prefix: /loki
  replication_factor: 3
  ring:
    kvstore:
      store: memberlist

memberlist:
  join_members:
    - loki-gossip-ring:7946
  dead_node_reclaim_time: 30s
  gossip_to_dead_nodes_time: 15s
  left_ingesters_timeout: 30s
  bind_addr:
    - "0.0.0.0"
  bind_port: 7946
  advertise_addr: ${POD_IP}
```

### Complete HA Configuration

```yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  log_level: info

common:
  path_prefix: /loki
  replication_factor: 3
  ring:
    kvstore:
      store: memberlist

memberlist:
  join_members:
    - loki-memberlist:7946
  dead_node_reclaim_time: 30s
  gossip_to_dead_nodes_time: 15s
  left_ingesters_timeout: 30s
  bind_addr:
    - "0.0.0.0"
  bind_port: 7946

ingester:
  lifecycler:
    ring:
      kvstore:
        store: memberlist
      replication_factor: 3
    num_tokens: 128
    heartbeat_period: 5s
    join_after: 30s
    observe_period: 10s
    min_ready_duration: 10s
    final_sleep: 30s
  chunk_idle_period: 30m
  chunk_retain_period: 1m
  max_transfer_retries: 0
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 4GB

distributor:
  ring:
    kvstore:
      store: memberlist

querier:
  max_concurrent: 20
  query_ingesters_within: 3h

query_frontend:
  max_outstanding_per_tenant: 4096
  compress_responses: true

query_scheduler:
  max_outstanding_requests_per_tenant: 4096

compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  compactor_ring:
    kvstore:
      store: memberlist

ruler:
  storage:
    type: s3
    s3:
      bucketnames: loki-ruler
  ring:
    kvstore:
      store: memberlist
  enable_api: true

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  aws:
    s3: s3://us-east-1/loki-bucket
    s3forcepathstyle: false
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    shared_store: s3

limits_config:
  ingestion_rate_mb: 32
  ingestion_burst_size_mb: 64
  max_streams_per_user: 50000
  max_query_parallelism: 32
```

## Kubernetes Deployment

### Memberlist Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: loki-memberlist
  namespace: loki
spec:
  type: ClusterIP
  clusterIP: None
  ports:
    - name: gossip
      port: 7946
      targetPort: 7946
      protocol: TCP
  selector:
    app.kubernetes.io/part-of: loki
```

### Ingester StatefulSet (HA)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-ingester
  namespace: loki
spec:
  serviceName: loki-ingester
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: loki-ingester
  template:
    metadata:
      labels:
        app: loki-ingester
        app.kubernetes.io/part-of: loki
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: loki-ingester
              topologyKey: kubernetes.io/hostname
      terminationGracePeriodSeconds: 300
      containers:
        - name: ingester
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=ingester
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          ports:
            - name: http
              containerPort: 3100
            - name: grpc
              containerPort: 9095
            - name: gossip
              containerPort: 7946
          volumeMounts:
            - name: config
              mountPath: /etc/loki
            - name: data
              mountPath: /loki
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 60
            periodSeconds: 30
      volumes:
        - name: config
          configMap:
            name: loki-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

### Distributor Deployment (HA)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-distributor
  namespace: loki
spec:
  replicas: 3
  selector:
    matchLabels:
      app: loki-distributor
  template:
    metadata:
      labels:
        app: loki-distributor
        app.kubernetes.io/part-of: loki
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: loki-distributor
                topologyKey: kubernetes.io/hostname
      containers:
        - name: distributor
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=distributor
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          ports:
            - name: http
              containerPort: 3100
            - name: grpc
              containerPort: 9095
            - name: gossip
              containerPort: 7946
          volumeMounts:
            - name: config
              mountPath: /etc/loki
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
      volumes:
        - name: config
          configMap:
            name: loki-config
```

### Querier Deployment (HA)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-querier
  namespace: loki
spec:
  replicas: 3
  selector:
    matchLabels:
      app: loki-querier
  template:
    metadata:
      labels:
        app: loki-querier
        app.kubernetes.io/part-of: loki
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: loki-querier
                topologyKey: kubernetes.io/hostname
      containers:
        - name: querier
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=querier
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          ports:
            - name: http
              containerPort: 3100
            - name: grpc
              containerPort: 9095
            - name: gossip
              containerPort: 7946
          volumeMounts:
            - name: config
              mountPath: /etc/loki
            - name: cache
              mountPath: /loki
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
      volumes:
        - name: config
          configMap:
            name: loki-config
        - name: cache
          emptyDir: {}
```

## Ring Health Monitoring

### Check Ring Status

```bash
# Port-forward to any Loki component
kubectl port-forward -n loki svc/loki-distributor 3100:3100

# View ring status
curl http://localhost:3100/ring
```

### Ring Metrics

```promql
# Ring members by state
sum by (state) (cortex_ring_members{job="loki"})

# Active ingesters
count(cortex_ring_members{job="loki", name="ingester", state="ACTIVE"})

# Unhealthy members
sum(cortex_ring_members{job="loki", state!="ACTIVE"})
```

### Ring Alerts

```yaml
groups:
  - name: loki-ring-alerts
    rules:
      - alert: LokiRingUnhealthy
        expr: |
          sum(cortex_ring_members{job="loki", name="ingester", state!="ACTIVE"}) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Loki ring has unhealthy members"
          description: "{{ $value }} ingesters are not in ACTIVE state"

      - alert: LokiRingMembersMissing
        expr: |
          count(cortex_ring_members{job="loki", name="ingester", state="ACTIVE"}) < 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Not enough active ring members"
          description: "Only {{ $value }} active ingesters, expected 3"
```

## Failure Handling

### Ingester Failure Recovery

When an ingester fails:

1. Ring detects failure via heartbeat
2. Tokens are transferred to healthy ingesters
3. WAL enables data recovery on restart

```yaml
ingester:
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 4GB
  lifecycler:
    ring:
      heartbeat_timeout: 1m
```

### Graceful Shutdown

```yaml
ingester:
  lifecycler:
    final_sleep: 30s  # Time to allow in-flight requests
```

Configure proper termination grace period:

```yaml
spec:
  terminationGracePeriodSeconds: 300
```

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

### WAL Recovery

On ingester restart:
1. WAL is replayed to recover unflushed data
2. Memory ceiling limits replay impact
3. Service becomes ready after replay

## Testing HA

### Simulate Ingester Failure

```bash
# Delete one ingester pod
kubectl delete pod -n loki loki-ingester-0

# Watch recovery
kubectl get pods -n loki -w

# Verify ring recovers
curl http://localhost:3100/ring
```

### Verify Data Replication

```bash
# Push test log
curl -X POST "http://loki:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -H "X-Scope-OrgID: test" \
  -d '{"streams":[{"stream":{"test":"ha"},"values":[["'"$(date +%s)"'000000000","HA test"]]}]}'

# Kill an ingester
kubectl delete pod -n loki loki-ingester-0

# Query should still work
curl -G "http://loki:3100/loki/api/v1/query" \
  -H "X-Scope-OrgID: test" \
  --data-urlencode 'query={test="ha"}'
```

## Best Practices

### Replication Factor

- **Minimum 3** for production
- Allows 1 failure with quorum
- Higher for critical workloads

### Resource Allocation

```yaml
# Per component recommendations (3 replicas each)
ingester:
  requests: 500m CPU, 2Gi RAM
  limits: 2000m CPU, 4Gi RAM

distributor:
  requests: 250m CPU, 512Mi RAM
  limits: 1000m CPU, 1Gi RAM

querier:
  requests: 500m CPU, 1Gi RAM
  limits: 2000m CPU, 4Gi RAM
```

### Storage Configuration

- Use object storage (not filesystem) for HA
- Enable TSDB for better performance
- Configure appropriate retention

## Conclusion

High availability in Loki requires proper configuration of replication, ring coordination, and failure handling. Key takeaways:

- Use replication factor of at least 3
- Configure memberlist for ring coordination
- Enable WAL for data durability
- Use pod anti-affinity for fault tolerance
- Monitor ring health continuously
- Test failure scenarios regularly

With proper HA configuration, your Loki deployment can survive component failures without data loss.
