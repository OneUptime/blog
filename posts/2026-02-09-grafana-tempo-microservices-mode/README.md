# How to Deploy Grafana Tempo in Microservices Mode for Scalable Kubernetes Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Tempo, Kubernetes, Tracing

Description: Deploy Grafana Tempo in microservices mode on Kubernetes for horizontally scalable distributed tracing with independent component scaling and high availability.

---

Grafana Tempo's monolithic mode works well for small deployments, but production environments require the scalability and resilience of microservices mode. In this architecture, each Tempo component (distributor, ingester, querier, compactor) runs independently, enabling horizontal scaling, targeted resource allocation, and high availability. This guide demonstrates deploying production-ready Tempo in microservices mode.

## Understanding Tempo Microservices Architecture

Tempo microservices mode splits functionality across components:

**Distributor**: Receives traces and distributes to ingesters
**Ingester**: Buffers and writes traces to storage
**Querier**: Queries traces from storage and ingesters
**Query Frontend**: Caches and splits queries for performance
**Compactor**: Compacts and optimizes trace blocks
**Metrics Generator**: Generates metrics from spans (optional)

## Configuring Storage Backend

Set up object storage (S3 example):

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

    ingester:
      lifecycler:
        ring:
          replication_factor: 3
          kvstore:
            store: memberlist
      max_block_duration: 30m
      max_block_bytes: 524288000  # 500MB
      complete_block_timeout: 1m

    memberlist:
      join_members:
        - tempo-gossip-ring.tracing.svc.cluster.local:7946

    compactor:
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
      max_traces_per_user: 100000
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
```

## Deploying Ingester

Store and index traces:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tempo-ingester
  namespace: tracing
spec:
  serviceName: tempo-ingester
  replicas: 3
  selector:
    matchLabels:
      app: tempo-ingester
  template:
    metadata:
      labels:
        app: tempo-ingester
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -target=ingester
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
  name: tempo-ingester
  namespace: tracing
spec:
  clusterIP: None
  selector:
    app: tempo-ingester
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
      volumes:
      - name: config
        configMap:
          name: tempo-config
```

## Deploying Compactor

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-compactor
  namespace: tracing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tempo-compactor
  template:
    metadata:
      labels:
        app: tempo-compactor
        tempo-gossip-member: "true"
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
        - -config.file=/etc/tempo/tempo.yaml
        - -target=compactor
        ports:
        - containerPort: 3200
          name: http
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
rate(tempo_distributor_ingester_append_failures_total[5m])

# Ingester metrics
tempo_ingester_blocks_flushed_total
tempo_ingester_live_traces

# Querier metrics
histogram_quantile(0.99, rate(tempo_querier_query_duration_seconds_bucket[5m]))

# Compactor metrics
tempo_compactor_blocks_compacted_total
```

## Scaling Strategy

Scale components independently:

```bash
# Scale distributors for high ingestion
kubectl scale deployment tempo-distributor -n tracing --replicas=5

# Scale queriers for query load
kubectl scale deployment tempo-querier -n tracing --replicas=5

# Scale ingesters (requires careful planning)
kubectl scale statefulset tempo-ingester -n tracing --replicas=5
```

## Best Practices

1. **Use object storage**: S3, GCS, or Azure Blob for production
2. **Monitor ring health**: Ensure proper gossip membership
3. **Tune ingester settings**: Balance block size with flush frequency
4. **Cache query results**: Use query frontend for performance
5. **Set appropriate retention**: Balance cost with compliance needs
6. **Scale based on metrics**: Monitor and adjust replicas
7. **Test failover**: Verify HA configuration works

## Conclusion

Tempo microservices mode provides the scalability and resilience needed for production tracing in Kubernetes. Independent component scaling enables optimization for specific workloads, while the memberlist gossip protocol ensures coordination. Start with conservative replica counts, monitor component performance, and scale based on actual traffic patterns. The combination of Tempo's efficient storage and microservices architecture creates a cost-effective, high-performance tracing solution.
