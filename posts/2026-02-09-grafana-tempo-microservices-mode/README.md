# How to Deploy Grafana Tempo in Microservices Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Tempo, Kubernetes, Tracing

Description: Deploy Grafana Tempo in microservices mode on Kubernetes for horizontally scalable distributed tracing with independent component scaling and high availability.

---

Grafana Tempo's monolithic mode works well for small deployments, but production environments require the scalability and resilience of microservices mode. In this architecture, each Tempo component (distributor, block-builder, live-store, querier, backend scheduler, and backend worker) runs independently, enabling horizontal scaling, targeted resource allocation, and high availability. This guide demonstrates deploying production-ready Tempo in microservices mode.

## Understanding Tempo Microservices Architecture

Tempo microservices mode splits functionality across components:

**Distributor**: Receives traces and writes them to Kafka
**Block Builder**: Consumes traces from Kafka and writes Parquet blocks to storage
**Live Store**: Consumes recent traces from Kafka and serves recent-data queries
**Querier**: Queries traces from object storage and live-stores
**Query Frontend**: Caches and splits queries for performance
**Backend Scheduler and Worker**: Compacts and optimizes trace blocks
**Metrics Generator**: Generates metrics from spans (optional)

## Configuring Storage Backend

Set up object storage and Kafka-compatible ingest (S3 example):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tempo-config
  namespace: tracing
data:
  tempo.yaml: |
    multitenancy_enabled: false

    server:
      http_listen_port: 3200
      grpc_listen_port: 9095

    distributor:
      receivers:
        otlp:
          protocols:
            grpc:
              endpoint: 0.0.0.0:4317
            http:
              endpoint: 0.0.0.0:4318
        jaeger:
          protocols:
            grpc:
              endpoint: 0.0.0.0:14250
            thrift_http:
              endpoint: 0.0.0.0:14268

    ingest:
      kafka:
        address: kafka.tracing.svc.cluster.local:9092
        topic: tempo-ingest

    block_builder:
      consume_cycle_duration: 5m
      block:
        max_block_bytes: 524288000  # 500MB

    live_store:
      max_trace_idle: 10s
      complete_block_timeout: 20m

    memberlist:
      join_members:
        - tempo-gossip-ring.tracing.svc.cluster.local:7946

    backend_scheduler:
      provider:
        compaction:
          compaction:
            block_retention: 168h  # 7 days

    backend_worker:
      backend_scheduler_addr: tempo-backend-scheduler.tracing.svc.cluster.local:9095
      ring:
        kvstore:
          store: memberlist
      compaction:
        block_retention: 168h  # 7 days
        compacted_block_retention: 1h
        compaction_window: 1h
        max_compaction_objects: 6000000
        max_block_bytes: 107374182400  # 100GB

    querier:
      frontend_worker:
        frontend_address: tempo-query-frontend.tracing.svc.cluster.local:9095
      max_concurrent_queries: 20

    query_frontend:
      max_outstanding_per_tenant: 2000

    storage:
      trace:
        backend: s3
        s3:
          bucket: tempo-traces
          endpoint: s3.amazonaws.com
          region: us-east-1
          access_key: ${S3_ACCESS_KEY}
          secret_key: ${S3_SECRET_KEY}
        wal:
          path: /var/tempo/wal
        pool:
          max_workers: 100
          queue_depth: 10000

    overrides:
      defaults:
        ingestion:
          max_traces_per_user: 100000
        global:
          max_bytes_per_trace: 5000000  # 5MB
```

## Deploying Distributor

Handle incoming traces:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-distributor
  namespace: tracing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tempo-distributor
  template:
    metadata:
      labels:
        app: tempo-distributor
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -config.expand-env=true
        - -target=distributor
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 14250
          name: jaeger-grpc
        - containerPort: 14268
          name: jaeger-http
        - containerPort: 7946
          name: gossip
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        envFrom:
        - secretRef:
            name: tempo-s3-credentials
      volumes:
      - name: config
        configMap:
          name: tempo-config
---
apiVersion: v1
kind: Service
metadata:
  name: tempo-distributor
  namespace: tracing
spec:
  selector:
    app: tempo-distributor
  ports:
  - name: http
    port: 3200
  - name: otlp-grpc
    port: 4317
  - name: otlp-http
    port: 4318
  - name: jaeger-grpc
    port: 14250
  - name: jaeger-http
    port: 14268
```

## Deploying Block Builder and Live Store

Write trace blocks and serve recent traces:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tempo-block-builder
  namespace: tracing
spec:
  serviceName: tempo-block-builder
  replicas: 3
  selector:
    matchLabels:
      app: tempo-block-builder
  template:
    metadata:
      labels:
        app: tempo-block-builder
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -config.expand-env=true
        - -target=block-builder
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 7946
          name: gossip
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        - name: block-builder-data
          mountPath: /var/tempo/block-builder/traces
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        envFrom:
        - secretRef:
            name: tempo-s3-credentials
      volumes:
      - name: config
        configMap:
          name: tempo-config
  volumeClaimTemplates:
  - metadata:
      name: block-builder-data
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: tempo-block-builder
  namespace: tracing
spec:
  clusterIP: None
  selector:
    app: tempo-block-builder
  ports:
  - name: http
    port: 3200
  - name: grpc
    port: 9095
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tempo-live-store
  namespace: tracing
spec:
  serviceName: tempo-live-store
  replicas: 3
  selector:
    matchLabels:
      app: tempo-live-store
  template:
    metadata:
      labels:
        app: tempo-live-store
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -config.expand-env=true
        - -target=live-store
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 7946
          name: gossip
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        - name: wal
          mountPath: /var/tempo/wal
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        envFrom:
        - secretRef:
            name: tempo-s3-credentials
      volumes:
      - name: config
        configMap:
          name: tempo-config
  volumeClaimTemplates:
  - metadata:
      name: wal
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: tempo-live-store
  namespace: tracing
spec:
  clusterIP: None
  selector:
    app: tempo-live-store
  ports:
  - name: http
    port: 3200
  - name: grpc
    port: 9095
```

## Deploying Query Frontend and Querier

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-query-frontend
  namespace: tracing
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tempo-query-frontend
  template:
    metadata:
      labels:
        app: tempo-query-frontend
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -config.expand-env=true
        - -target=query-frontend
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 9095
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        envFrom:
        - secretRef:
            name: tempo-s3-credentials
      volumes:
      - name: config
        configMap:
          name: tempo-config
---
apiVersion: v1
kind: Service
metadata:
  name: tempo-query-frontend
  namespace: tracing
spec:
  selector:
    app: tempo-query-frontend
  ports:
  - name: http
    port: 3200
  - name: grpc
    port: 9095
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-querier
  namespace: tracing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tempo-querier
  template:
    metadata:
      labels:
        app: tempo-querier
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -config.expand-env=true
        - -target=querier
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 7946
          name: gossip
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
          limits:
            cpu: 4000m
            memory: 4Gi
        envFrom:
        - secretRef:
            name: tempo-s3-credentials
      volumes:
      - name: config
        configMap:
          name: tempo-config
```

## Deploying Backend Scheduler and Worker

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-backend-scheduler
  namespace: tracing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tempo-backend-scheduler
  template:
    metadata:
      labels:
        app: tempo-backend-scheduler
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -config.expand-env=true
        - -target=backend-scheduler
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 7946
          name: gossip
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        envFrom:
        - secretRef:
            name: tempo-s3-credentials
      volumes:
      - name: config
        configMap:
          name: tempo-config
---
apiVersion: v1
kind: Service
metadata:
  name: tempo-backend-scheduler
  namespace: tracing
spec:
  selector:
    app: tempo-backend-scheduler
  ports:
  - name: http
    port: 3200
  - name: grpc
    port: 9095
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-backend-worker
  namespace: tracing
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tempo-backend-worker
  template:
    metadata:
      labels:
        app: tempo-backend-worker
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -config.expand-env=true
        - -target=backend-worker
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 7946
          name: gossip
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        envFrom:
        - secretRef:
            name: tempo-s3-credentials
      volumes:
      - name: config
        configMap:
          name: tempo-config
```

## Memberlist Gossip Ring Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tempo-gossip-ring
  namespace: tracing
spec:
  clusterIP: None
  selector:
    tempo-gossip-member: "true"
  ports:
  - name: gossip
    port: 7946
    protocol: TCP
```

## Configuring Grafana Data Source

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  tempo.yaml: |
    apiVersion: 1
    datasources:
    - name: Tempo
      type: tempo
      access: proxy
      url: http://tempo-query-frontend.tracing.svc.cluster.local:3200
      jsonData:
        httpMethod: GET
        tracesToLogs:
          datasourceUid: loki
          tags: ['trace_id']
```

## Monitoring Tempo Components

```promql
# Distributor metrics

rate(tempo_distributor_spans_received_total[5m])
rate(tempo_discarded_spans_total[5m])

# Block-builder and live-store metrics
tempo_block_builder_flushed_blocks
tempo_live_store_traces_created_total
tempo_ingest_group_partition_lag{group="block-builder"}
tempo_ingest_group_partition_lag{group="live-store"}

# Query frontend metrics
tempo_query_frontend_queue_length
rate(tempo_query_frontend_queries_total[5m])

# Backend worker metrics
tempodb_compaction_blocks_total
tempo_backend_scheduler_jobs_failed_total
tempodb_compaction_outstanding_blocks
```

## Scaling Strategy

Scale components independently:

```bash
# Scale distributors for high ingestion
kubectl scale deployment tempo-distributor -n tracing --replicas=5

# Scale queriers for query load
kubectl scale deployment tempo-querier -n tracing --replicas=5

# Scale block builders and live stores (requires careful planning)
kubectl scale statefulset tempo-block-builder -n tracing --replicas=5
kubectl scale statefulset tempo-live-store -n tracing --replicas=5
```

## Best Practices

1. **Use object storage**: S3, GCS, or Azure Blob for production
2. **Monitor ring health**: Ensure proper gossip membership
3. **Tune block-builder and live-store settings**: Balance block size with flush frequency
4. **Cache query results**: Use query frontend for performance
5. **Set appropriate retention**: Balance cost with compliance needs
6. **Scale based on metrics**: Monitor and adjust replicas
7. **Test failover**: Verify HA configuration works

## Conclusion

Tempo microservices mode provides the scalability and resilience needed for production tracing in Kubernetes. Independent component scaling enables optimization for specific workloads, while the memberlist gossip protocol ensures coordination. Start with conservative replica counts, monitor component performance, and scale based on actual traffic patterns. The combination of Tempo's efficient storage and microservices architecture creates a cost-effective, high-performance tracing solution.
