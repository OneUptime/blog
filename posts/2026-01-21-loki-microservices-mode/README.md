# How to Set Up Loki in Microservices Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Microservices, Distributed Systems, Log Management, Scalability, High Availability

Description: A comprehensive guide to deploying Grafana Loki in microservices mode for scalable distributed log aggregation, covering component architecture, configuration, and production deployment patterns.

---

Grafana Loki's microservices mode (also known as distributed mode) allows you to scale individual components independently based on your workload requirements. This architecture is essential for high-volume production environments where you need fine-grained control over resource allocation and horizontal scaling. In this guide, you will learn how to deploy and configure Loki in microservices mode.

## Understanding Loki's Architecture

Loki consists of several components that can run as separate microservices:

### Write Path Components

- **Distributor**: Receives incoming log streams, validates them, and distributes to ingesters
- **Ingester**: Writes logs to long-term storage and serves recent data from memory

### Read Path Components

- **Querier**: Executes LogQL queries against both ingesters and storage
- **Query Frontend**: Provides query caching, splitting, and scheduling
- **Query Scheduler**: Distributes queries across queriers

### Backend Components

- **Compactor**: Compacts index files and handles retention
- **Ruler**: Evaluates alerting and recording rules
- **Index Gateway**: Serves index queries to queriers

### Infrastructure Components

- **Ring**: Consistent hash ring for component discovery
- **Memberlist**: Gossip protocol for cluster coordination

## Prerequisites

Before starting, ensure you have:

- Kubernetes cluster with 8+ nodes or equivalent resources
- Object storage (S3, GCS, Azure Blob, or MinIO)
- At least 32GB total RAM available
- Understanding of Loki's basic concepts

## Component Configuration

### Base Configuration

Create a shared configuration file `loki-config.yaml`:

```yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  log_level: info
  grpc_server_max_recv_msg_size: 104857600
  grpc_server_max_send_msg_size: 104857600

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
    - 0.0.0.0
  bind_port: 7946

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
    s3: s3://access-key:secret-key@region/bucket-name
    s3forcepathstyle: false
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  max_cache_freshness_per_query: 10m
  split_queries_by_interval: 15m
  ingestion_rate_mb: 64
  ingestion_burst_size_mb: 128
  max_streams_per_user: 100000
  max_line_size: 256kb
  max_entries_limit_per_query: 10000
  max_query_parallelism: 32
  max_query_series: 1000
  cardinality_limit: 100000
  per_stream_rate_limit: 5MB
  per_stream_rate_limit_burst: 15MB

chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 500
      ttl: 1h

query_range:
  align_queries_with_step: true
  max_retries: 5
  cache_results: true
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 500
        ttl: 1h
  parallelise_shardable_queries: true

frontend:
  max_outstanding_per_tenant: 4096
  compress_responses: true
  downstream_url: http://loki-querier:3100

query_scheduler:
  max_outstanding_requests_per_tenant: 4096

querier:
  max_concurrent: 16
  query_ingesters_within: 3h

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
  chunk_encoding: snappy
  chunk_idle_period: 30m
  chunk_block_size: 262144
  chunk_retain_period: 1m
  max_transfer_retries: 0
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 4GB

compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: s3

ruler:
  storage:
    type: s3
    s3:
      bucketnames: loki-ruler
  rule_path: /loki/rules
  alertmanager_url: http://alertmanager:9093
  ring:
    kvstore:
      store: memberlist
  enable_api: true
```

## Kubernetes Deployment

### Namespace and ConfigMap

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: loki
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: loki
data:
  config.yaml: |
    # Insert the configuration from above
```

### Memberlist Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: loki-memberlist
  namespace: loki
spec:
  clusterIP: None
  ports:
    - name: gossip
      port: 7946
      targetPort: 7946
      protocol: TCP
  selector:
    app.kubernetes.io/part-of: loki
```

### Distributor Deployment

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
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 15
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 30
            periodSeconds: 30
      volumes:
        - name: config
          configMap:
            name: loki-config
---
apiVersion: v1
kind: Service
metadata:
  name: loki-distributor
  namespace: loki
spec:
  ports:
    - name: http
      port: 3100
      targetPort: 3100
    - name: grpc
      port: 9095
      targetPort: 9095
  selector:
    app: loki-distributor
```

### Ingester StatefulSet

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
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: loki-ingester
  namespace: loki
spec:
  clusterIP: None
  ports:
    - name: http
      port: 3100
      targetPort: 3100
    - name: grpc
      port: 9095
      targetPort: 9095
  selector:
    app: loki-ingester
```

### Query Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-query-frontend
  namespace: loki
spec:
  replicas: 2
  selector:
    matchLabels:
      app: loki-query-frontend
  template:
    metadata:
      labels:
        app: loki-query-frontend
        app.kubernetes.io/part-of: loki
    spec:
      containers:
        - name: query-frontend
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=query-frontend
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
              memory: 2Gi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: loki-config
---
apiVersion: v1
kind: Service
metadata:
  name: loki-query-frontend
  namespace: loki
spec:
  ports:
    - name: http
      port: 3100
      targetPort: 3100
    - name: grpc
      port: 9095
      targetPort: 9095
  selector:
    app: loki-query-frontend
```

### Querier Deployment

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
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: loki-config
        - name: cache
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: loki-querier
  namespace: loki
spec:
  ports:
    - name: http
      port: 3100
      targetPort: 3100
    - name: grpc
      port: 9095
      targetPort: 9095
  selector:
    app: loki-querier
```

### Query Scheduler Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-query-scheduler
  namespace: loki
spec:
  replicas: 2
  selector:
    matchLabels:
      app: loki-query-scheduler
  template:
    metadata:
      labels:
        app: loki-query-scheduler
        app.kubernetes.io/part-of: loki
    spec:
      containers:
        - name: query-scheduler
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=query-scheduler
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
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: loki-config
---
apiVersion: v1
kind: Service
metadata:
  name: loki-query-scheduler
  namespace: loki
spec:
  ports:
    - name: http
      port: 3100
      targetPort: 3100
    - name: grpc
      port: 9095
      targetPort: 9095
  selector:
    app: loki-query-scheduler
```

### Compactor StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-compactor
  namespace: loki
spec:
  serviceName: loki-compactor
  replicas: 1
  selector:
    matchLabels:
      app: loki-compactor
  template:
    metadata:
      labels:
        app: loki-compactor
        app.kubernetes.io/part-of: loki
    spec:
      containers:
        - name: compactor
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=compactor
          ports:
            - name: http
              containerPort: 3100
            - name: gossip
              containerPort: 7946
          volumeMounts:
            - name: config
              mountPath: /etc/loki
            - name: data
              mountPath: /loki
          resources:
            requests:
              cpu: 250m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: loki-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: standard
        resources:
          requests:
            storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: loki-compactor
  namespace: loki
spec:
  ports:
    - name: http
      port: 3100
      targetPort: 3100
  selector:
    app: loki-compactor
```

### Index Gateway Deployment

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-index-gateway
  namespace: loki
spec:
  serviceName: loki-index-gateway
  replicas: 2
  selector:
    matchLabels:
      app: loki-index-gateway
  template:
    metadata:
      labels:
        app: loki-index-gateway
        app.kubernetes.io/part-of: loki
    spec:
      containers:
        - name: index-gateway
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=index-gateway
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
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: loki-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: standard
        resources:
          requests:
            storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: loki-index-gateway
  namespace: loki
spec:
  ports:
    - name: http
      port: 3100
      targetPort: 3100
    - name: grpc
      port: 9095
      targetPort: 9095
  selector:
    app: loki-index-gateway
```

### Gateway (NGINX)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-gateway-config
  namespace: loki
data:
  nginx.conf: |
    worker_processes  5;
    error_log  /dev/stderr;
    pid        /tmp/nginx.pid;
    worker_rlimit_nofile 8192;

    events {
      worker_connections  4096;
    }

    http {
      default_type application/octet-stream;
      log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent"';
      access_log /dev/stderr main;

      sendfile     on;
      tcp_nopush   on;

      client_max_body_size 100M;

      upstream distributor {
        server loki-distributor:3100;
      }

      upstream querier {
        server loki-query-frontend:3100;
      }

      upstream query-frontend {
        server loki-query-frontend:3100;
      }

      server {
        listen 80;

        location = /ready {
          proxy_pass http://querier/ready;
        }

        location = /loki/api/v1/push {
          proxy_pass http://distributor$request_uri;
          proxy_http_version 1.1;
          proxy_set_header Connection "";
        }

        location = /loki/api/v1/tail {
          proxy_pass http://querier$request_uri;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_read_timeout 3600s;
        }

        location ~ /loki/api/.* {
          proxy_pass http://query-frontend$request_uri;
          proxy_http_version 1.1;
          proxy_set_header Connection "";
          proxy_read_timeout 300s;
        }

        location ~ /api/prom/.* {
          proxy_pass http://query-frontend$request_uri;
          proxy_http_version 1.1;
          proxy_set_header Connection "";
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-gateway
  namespace: loki
spec:
  replicas: 2
  selector:
    matchLabels:
      app: loki-gateway
  template:
    metadata:
      labels:
        app: loki-gateway
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - name: http
              containerPort: 80
          volumeMounts:
            - name: config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 500m
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: loki-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: loki-gateway
  namespace: loki
spec:
  type: LoadBalancer
  ports:
    - name: http
      port: 80
      targetPort: 80
  selector:
    app: loki-gateway
```

## Scaling Guidelines

### When to Scale Each Component

| Component | Scale When | Scaling Strategy |
|-----------|------------|------------------|
| Distributor | High ingestion rate | Horizontal (replicas) |
| Ingester | Memory pressure, high write throughput | Horizontal with ring coordination |
| Querier | Slow queries, high query load | Horizontal (replicas) |
| Query Frontend | High query concurrency | Horizontal (2-3 replicas usually sufficient) |
| Query Scheduler | High number of concurrent queries | Horizontal (2 replicas usually sufficient) |
| Compactor | Retention backlog | Vertical only (single instance) |
| Index Gateway | Slow index queries | Horizontal with shared cache |

### Scaling Ingesters Safely

When scaling ingesters, follow this process:

```bash
# 1. Update the StatefulSet replicas
kubectl scale statefulset loki-ingester -n loki --replicas=5

# 2. Monitor the ring status
kubectl port-forward -n loki svc/loki-distributor 3100:3100
curl http://localhost:3100/ring

# 3. Wait for new ingesters to join and become active
# Watch for ACTIVE state in all ingesters
```

## Monitoring the Cluster

### Key Metrics to Watch

```yaml
# Distributor metrics
loki_distributor_lines_received_total
loki_distributor_bytes_received_total

# Ingester metrics
loki_ingester_chunks_flushed_total
loki_ingester_wal_logged_bytes_total
loki_ingester_memory_chunks

# Query metrics
loki_query_frontend_queries_total
loki_querier_tail_active

# Ring health
cortex_ring_members
```

### Grafana Dashboard Query Examples

```logql
# Ingestion rate by tenant
sum(rate(loki_distributor_bytes_received_total[5m])) by (tenant)

# Query latency percentiles
histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le))

# Ring member status
cortex_ring_members{state="ACTIVE"}
```

## Troubleshooting

### Check Ring Status

```bash
# Port-forward to any Loki component
kubectl port-forward -n loki svc/loki-distributor 3100:3100

# View ring status
curl http://localhost:3100/ring
```

### Check Component Logs

```bash
# Distributor logs
kubectl logs -n loki -l app=loki-distributor --tail=100

# Ingester logs
kubectl logs -n loki -l app=loki-ingester --tail=100

# Query frontend logs
kubectl logs -n loki -l app=loki-query-frontend --tail=100
```

### Common Issues

**Ingesters Not Joining Ring**:
```bash
# Check memberlist connectivity
kubectl exec -n loki -it loki-ingester-0 -- wget -q -O- http://localhost:7946/memberlist
```

**High Query Latency**:
```bash
# Check query queue depth
curl http://localhost:3100/metrics | grep loki_query_scheduler
```

## Conclusion

Deploying Loki in microservices mode provides the flexibility and scalability needed for high-volume production environments. Key takeaways:

- Each component can be scaled independently based on workload
- Use memberlist for gossip-based coordination in Kubernetes
- Configure anti-affinity rules to spread components across nodes
- Monitor ring health and component metrics closely
- Follow safe scaling procedures for stateful components like ingesters
- Use a gateway for routing write and read traffic appropriately

This architecture enables you to handle millions of log lines per second while maintaining query performance and reliability.
