# How to Deploy Redis with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Redis, Caching

Description: Learn how to deploy and manage Redis on Kubernetes with ArgoCD, including standalone caching, Sentinel for HA, Redis Cluster for sharding, and production tuning.

---

Redis is the go-to in-memory data store for caching, session management, message queues, and real-time analytics. It is one of the most commonly deployed services on Kubernetes. This guide covers deploying Redis with ArgoCD, from a simple caching instance to a production-grade high-availability setup.

## Redis Deployment Modes

Redis supports several deployment topologies:

- **Standalone**: Single instance. Simple, fast, no failover.
- **Sentinel**: Primary with replicas and Sentinel for automatic failover.
- **Cluster**: Sharded across multiple nodes. Horizontal scaling for large datasets.

The right choice depends on your use case:

| Use Case | Mode | Why |
|---|---|---|
| Application cache | Standalone | Data loss is acceptable |
| Session store | Sentinel | Need HA but not sharding |
| Large dataset | Cluster | Need horizontal scaling |
| Rate limiting | Standalone or Sentinel | Depends on criticality |
| Message queue | Sentinel | Need durability and HA |

## Standalone Redis for Caching

The simplest deployment for an application cache:

```yaml
# apps/redis/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
data:
  redis.conf: |
    # Memory management
    maxmemory 1gb
    maxmemory-policy allkeys-lru

    # Performance
    tcp-backlog 511
    tcp-keepalive 300
    timeout 0

    # Persistence (disable for pure cache)
    save ""
    appendonly no

    # Security
    bind 0.0.0.0
    protected-mode no

    # Logging
    loglevel notice
---
# apps/redis/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command: ["redis-server", "/etc/redis/redis.conf"]
          volumeMounts:
            - name: config
              mountPath: /etc/redis
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 1Gi
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: redis-config
---
# apps/redis/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

## ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/redis
  destination:
    server: https://kubernetes.default.svc
    namespace: cache
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

For a pure cache (no persistence), auto-prune is safe since data loss is acceptable.

## Redis with Persistence

If Redis holds data that should survive restarts, add a PVC:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  strategy:
    type: Recreate  # Required for PVC with ReadWriteOnce
  selector:
    matchLabels:
      app: redis
  template:
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          command: ["redis-server", "/etc/redis/redis.conf"]
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /etc/redis
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: redis-data
        - name: config
          configMap:
            name: redis-config
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 10Gi
```

Update the Redis config for persistence:

```yaml
data:
  redis.conf: |
    # RDB snapshots
    save 900 1
    save 300 10
    save 60 10000
    dbfilename dump.rdb
    dir /data

    # AOF persistence
    appendonly yes
    appendfsync everysec
    appendfilename "appendonly.aof"

    # Memory
    maxmemory 1gb
    maxmemory-policy allkeys-lru
```

## Redis with Helm Chart

The Bitnami Redis chart provides Sentinel-based HA:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis-ha
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: redis
    targetRevision: 18.6.0
    helm:
      values: |
        # Architecture: standalone or replication
        architecture: replication

        auth:
          enabled: true
          password: changeme-redis

        master:
          persistence:
            enabled: true
            storageClass: fast-ssd
            size: 10Gi
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 2Gi

        replica:
          replicaCount: 3
          persistence:
            enabled: true
            storageClass: fast-ssd
            size: 10Gi
          resources:
            requests:
              cpu: 100m
              memory: 256Mi

        sentinel:
          enabled: true
          masterSet: mymaster
          quorum: 2
          resources:
            requests:
              cpu: 50m
              memory: 64Mi

        metrics:
          enabled: true
          serviceMonitor:
            enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: cache
  syncPolicy:
    automated:
      prune: false  # Protect persistent data
      selfHeal: true
```

## Redis Cluster with StatefulSet

For horizontal scaling across multiple shards:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster-headless
  replicas: 6  # 3 primaries + 3 replicas
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
              name: client
            - containerPort: 16379
              name: gossip
          command: ["redis-server"]
          args:
            - "/etc/redis/redis.conf"
            - "--cluster-enabled"
            - "yes"
            - "--cluster-config-file"
            - "/data/nodes.conf"
            - "--cluster-node-timeout"
            - "5000"
            - "--appendonly"
            - "yes"
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /etc/redis
          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 2Gi
      volumes:
        - name: config
          configMap:
            name: redis-cluster-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster-headless
spec:
  clusterIP: None
  selector:
    app: redis-cluster
  ports:
    - port: 6379
      name: client
    - port: 16379
      name: gossip
---
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
spec:
  selector:
    app: redis-cluster
  ports:
    - port: 6379
      targetPort: 6379
```

Initialize the cluster with a PostSync hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: init-redis-cluster
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: init
          image: redis:7.2-alpine
          command: [sh, -c]
          args:
            - |
              # Wait for all pods to be ready
              sleep 30

              # Check if cluster is already initialized
              CLUSTER_INFO=$(redis-cli -h redis-cluster-0.redis-cluster-headless cluster info 2>/dev/null)
              if echo "$CLUSTER_INFO" | grep -q "cluster_state:ok"; then
                echo "Cluster already initialized"
                exit 0
              fi

              # Build the list of nodes
              NODES=""
              for i in $(seq 0 5); do
                NODES="$NODES redis-cluster-$i.redis-cluster-headless:6379"
              done

              # Create the cluster
              echo "yes" | redis-cli --cluster create $NODES \
                --cluster-replicas 1
      restartPolicy: OnFailure
```

## Redis Configuration Tuning

Different workloads need different Redis configurations. Manage these through ConfigMaps in Git:

```yaml
# Cache-optimized configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cache-config
data:
  redis.conf: |
    # No persistence - pure cache
    save ""
    appendonly no

    # Aggressive memory management
    maxmemory 2gb
    maxmemory-policy allkeys-lfu
    maxmemory-samples 10

    # TCP tuning
    tcp-backlog 511
    tcp-keepalive 300

    # Disable slow operations
    slowlog-log-slower-than 10000
    slowlog-max-len 128
---
# Session store configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-session-config
data:
  redis.conf: |
    # Persistence for durability
    save 60 1000
    appendonly yes
    appendfsync everysec

    # Memory
    maxmemory 1gb
    maxmemory-policy volatile-lru

    # Key expiration
    hz 10
```

## Monitoring Redis

Deploy Redis Exporter for Prometheus:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      containers:
        - name: exporter
          image: oliver006/redis_exporter:v1.56.0
          ports:
            - containerPort: 9121
          env:
            - name: REDIS_ADDR
              value: "redis://redis.cache.svc:6379"
```

Key metrics to monitor:

- `redis_memory_used_bytes` - Current memory usage
- `redis_connected_clients` - Active client connections
- `redis_keyspace_hits_total` / `redis_keyspace_misses_total` - Cache hit ratio
- `redis_commands_processed_total` - Throughput
- `redis_evicted_keys_total` - Keys evicted due to maxmemory

## Summary

Deploying Redis with ArgoCD gives you version-controlled caching and data store infrastructure. For pure caching, a simple Deployment is sufficient - auto-prune is safe since cache data is ephemeral. For session stores or persistent data, add PVCs and disable auto-prune. For production HA, use the Bitnami Helm chart with Sentinel, or deploy a Redis Cluster for horizontal scaling. The configuration choices between persistence modes, eviction policies, and memory limits are all declared in Git ConfigMaps and managed through ArgoCD, making your Redis infrastructure fully reproducible across environments.
