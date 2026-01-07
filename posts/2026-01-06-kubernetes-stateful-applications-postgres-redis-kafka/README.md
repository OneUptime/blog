# How to Run Stateful Applications in Kubernetes (PostgreSQL, Redis, Kafka)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, PostgreSQL, Redis, Kafka, Database, DevOps

Description: A comprehensive guide to running stateful applications in Kubernetes, including PostgreSQL databases, Redis clusters, and Apache Kafka, with production-ready configurations.

---

Stateful applications need stable network identities, persistent storage, and ordered deployment. Kubernetes StatefulSets provide all three. Here's how to run databases and message queues reliably.

## Understanding StatefulSets

```mermaid
flowchart TB
    subgraph StatefulSet
        P0[pod-0] --> PVC0[pvc-pod-0]
        P1[pod-1] --> PVC1[pvc-pod-1]
        P2[pod-2] --> PVC2[pvc-pod-2]
    end

    subgraph Features
        F1[Stable Network IDs]
        F2[Ordered Deployment]
        F3[Persistent Storage]
    end

    SVC[Headless Service] --> P0
    SVC --> P1
    SVC --> P2
```

### StatefulSet vs Deployment

| Feature | Deployment | StatefulSet |
|---------|------------|-------------|
| Pod names | Random suffix | Ordered index |
| Pod identity | Interchangeable | Stable, unique |
| Storage | Shared or ephemeral | Per-pod persistent |
| Scaling | Parallel | Ordered |
| Updates | Parallel | Ordered |

## Running PostgreSQL

### Basic StatefulSet

This configuration deploys a single PostgreSQL instance with persistent storage. The headless service enables direct pod DNS access, and the StatefulSet ensures data persistence across restarts.

```yaml
# Headless service for stable network identity
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    app: postgres
spec:
  ports:
    - port: 5432
      name: postgres
  clusterIP: None  # Headless service - no load balancing, direct pod access
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres  # Must match the headless service name
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
              name: postgres
          env:
            # Database to create on first startup
            - name: POSTGRES_DB
              value: myapp
            # Credentials from Kubernetes secret for security
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            # Data directory inside the persistent volume
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          # Resource limits prevent noisy neighbor issues
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
          # Liveness probe restarts unhealthy pods
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 30
            periodSeconds: 10
          # Readiness probe controls traffic routing
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 5
            periodSeconds: 5
  # VolumeClaimTemplate creates a PVC for each pod
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd  # Use SSD for database workloads
        resources:
          requests:
            storage: 100Gi
```

### PostgreSQL HA with Patroni

Patroni provides automatic failover and high availability for PostgreSQL. It uses Kubernetes endpoints for leader election and manages replication automatically.

```yaml
# ConfigMap for Patroni configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
data:
  PATRONI_KUBERNETES_LABELS: "{app: postgres}"  # Labels for pod discovery
  PATRONI_KUBERNETES_NAMESPACE: default
  PATRONI_KUBERNETES_USE_ENDPOINTS: "true"  # Use endpoints for leader election
  PATRONI_NAME: postgres
  PATRONI_POSTGRESQL_DATA_DIR: /var/lib/postgresql/data/pgdata
  PATRONI_POSTGRESQL_PGPASS: /tmp/pgpass
  PATRONI_REPLICATION_USERNAME: replicator  # User for streaming replication
  PATRONI_SUPERUSER_USERNAME: postgres
  PATRONI_SCOPE: postgres-cluster  # Cluster identifier
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3  # 3 nodes for HA: 1 leader + 2 replicas
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      # ServiceAccount with RBAC for leader election
      serviceAccountName: postgres
      containers:
        - name: postgres
          image: patroni:latest
          ports:
            - containerPort: 5432
              name: postgres
            - containerPort: 8008
              name: patroni  # Patroni REST API port
          # Load all non-secret config from ConfigMap
          envFrom:
            - configMapRef:
                name: postgres-config
          # Sensitive credentials from Secret
          env:
            - name: PATRONI_SUPERUSER_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: superuser-password
            - name: PATRONI_REPLICATION_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: replication-password
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

### PostgreSQL Operator (Zalando)

For production, use an operator:

Operators encode operational knowledge and automate complex tasks like backups, failover, and upgrades. The Zalando Postgres Operator is production-proven at scale.

```bash
# Install the Zalando PostgreSQL Operator using Helm
helm repo add postgres-operator https://opensource.zalando.com/postgres-operator/charts/postgres-operator
helm install postgres-operator postgres-operator/postgres-operator
```

This custom resource creates a full PostgreSQL cluster with the operator handling all the complexity.

```yaml
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: myapp-postgres
spec:
  teamId: myteam  # Team identifier for multi-tenant clusters
  volume:
    size: 100Gi
    storageClass: fast-ssd
  numberOfInstances: 3  # 1 primary + 2 replicas
  # Users and databases to create
  users:
    myapp: []  # Create user 'myapp' with no special permissions
  databases:
    myapp: myapp  # Create database 'myapp' owned by user 'myapp'
  postgresql:
    version: "15"
    # PostgreSQL configuration parameters
    parameters:
      max_connections: "200"
      shared_buffers: 1GB
      effective_cache_size: 3GB
  # Resource allocation for each pod
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi
```

## Running Redis

### Single Instance

A single Redis instance is suitable for caching and non-critical data. This configuration includes persistence with AOF for durability.

```yaml
# Headless service for stable DNS
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
    - port: 6379
  clusterIP: None  # Headless for direct pod access
  selector:
    app: redis
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
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
          image: redis:7
          command:
            - redis-server
            - /etc/redis/redis.conf  # Use custom config
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data  # Redis data directory
            - name: redis-config
              mountPath: /etc/redis  # Mount config file
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 1Gi
          # Health check using Redis PING command
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
# Redis configuration for persistence and memory management
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    appendonly yes              # Enable AOF persistence
    appendfsync everysec        # Sync to disk every second (balanced durability/performance)
    maxmemory 900mb             # Max memory (leave headroom for overhead)
    maxmemory-policy allkeys-lru  # Evict least recently used keys when full
```

### Redis Cluster (6 nodes)

Redis Cluster provides horizontal scaling and high availability across multiple nodes. This 6-node setup provides 3 masters with 1 replica each.

```yaml
# ConfigMap with Redis Cluster-specific configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
data:
  redis.conf: |
    cluster-enabled yes           # Enable cluster mode
    cluster-config-file nodes.conf  # Cluster state file
    cluster-node-timeout 5000     # Node timeout in milliseconds
    appendonly yes                # Enable persistence
    appendfsync everysec          # Sync every second
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6  # 6 nodes: 3 masters + 3 replicas
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
          image: redis:7
          command:
            - redis-server
            - /etc/redis/redis.conf
          ports:
            - containerPort: 6379
              name: client  # Client connections
            - containerPort: 16379
              name: gossip  # Cluster bus for node-to-node communication
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis
          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: 1
              memory: 2Gi
      volumes:
        - name: redis-config
          configMap:
            name: redis-cluster-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

Initialize the cluster:

After the StatefulSet is running, you need to initialize the Redis Cluster. This command creates the cluster topology with automatic replica assignment.

```bash
# Get pod IPs for cluster creation
kubectl get pods -l app=redis-cluster -o jsonpath='{range.items[*]}{.status.podIP}:6379 {end}'

# Create the cluster using redis-cli from any redis pod
# --cluster-replicas 1 means each master gets 1 replica (6 nodes = 3 masters + 3 replicas)
kubectl exec -it redis-cluster-0 -- redis-cli --cluster create \
  redis-cluster-0.redis-cluster:6379 \
  redis-cluster-1.redis-cluster:6379 \
  redis-cluster-2.redis-cluster:6379 \
  redis-cluster-3.redis-cluster:6379 \
  redis-cluster-4.redis-cluster:6379 \
  redis-cluster-5.redis-cluster:6379 \
  --cluster-replicas 1
```

### Redis Sentinel (HA)

Redis Sentinel provides automatic failover for master-replica setups without sharding. The init container determines whether each pod should be master or replica.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 3  # 1 master + 2 replicas
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      # Init container determines master vs replica configuration
      initContainers:
        - name: config
          image: redis:7
          command: ["/bin/sh", "-c"]
          args:
            - |
              # First pod (redis-0) becomes master, others become replicas
              if [[ ${HOSTNAME} == "redis-0" ]]; then
                cp /mnt/redis-master.conf /etc/redis/redis.conf
              else
                cp /mnt/redis-replica.conf /etc/redis/redis.conf
              fi
          volumeMounts:
            - name: redis-config-templates
              mountPath: /mnt
            - name: redis-config
              mountPath: /etc/redis
      containers:
        - name: redis
          image: redis:7
          command:
            - redis-server
            - /etc/redis/redis.conf
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis
      volumes:
        # Config templates from ConfigMap
        - name: redis-config-templates
          configMap:
            name: redis-config
        # Writable config directory
        - name: redis-config
          emptyDir: {}
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

## Running Apache Kafka

### Kafka with ZooKeeper

This traditional Kafka deployment uses ZooKeeper for cluster coordination. ZooKeeper manages broker metadata, topic configuration, and leader election.

```yaml
# ZooKeeper StatefulSet - required for Kafka cluster coordination
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
spec:
  serviceName: zookeeper
  replicas: 3  # Odd number for quorum (need majority for consensus)
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
        - name: zookeeper
          image: confluentinc/cp-zookeeper:7.5.0
          ports:
            - containerPort: 2181
              name: client  # Client connections
            - containerPort: 2888
              name: server  # Follower connections to leader
            - containerPort: 3888
              name: leader-election  # Leader election
          env:
            - name: ZOOKEEPER_CLIENT_PORT
              value: "2181"
            - name: ZOOKEEPER_TICK_TIME
              value: "2000"  # Base time unit in milliseconds
            - name: ZOOKEEPER_SERVER_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          command:
            - /bin/bash
            - -c
            - |
              # Extract pod ordinal from hostname (e.g., zookeeper-0 -> 1)
              export ZOOKEEPER_SERVER_ID=$((${HOSTNAME##*-} + 1))
              # Configure cluster members
              export ZOOKEEPER_SERVERS="zookeeper-0.zookeeper:2888:3888;zookeeper-1.zookeeper:2888:3888;zookeeper-2.zookeeper:2888:3888"
              /etc/confluent/docker/run
          volumeMounts:
            - name: zookeeper-data
              mountPath: /var/lib/zookeeper
          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi
  volumeClaimTemplates:
    - metadata:
        name: zookeeper-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
# Headless service for ZooKeeper pod discovery
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
spec:
  ports:
    - port: 2181
      name: client
  clusterIP: None
  selector:
    app: zookeeper
```

```yaml
# Kafka StatefulSet - the message broker cluster
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka
  replicas: 3  # 3 brokers for high availability
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
        - name: kafka
          image: confluentinc/cp-kafka:7.5.0
          ports:
            - containerPort: 9092
              name: kafka
          env:
            # ZooKeeper connection string
            - name: KAFKA_ZOOKEEPER_CONNECT
              value: "zookeeper-0.zookeeper:2181,zookeeper-1.zookeeper:2181,zookeeper-2.zookeeper:2181"
            # Listener configuration for internal and external access
            - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
              value: "INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT"
            - name: KAFKA_INTER_BROKER_LISTENER_NAME
              value: "INTERNAL"
            # Replication settings for durability
            - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
              value: "3"  # Consumer offsets replicated across all brokers
            - name: KAFKA_DEFAULT_REPLICATION_FACTOR
              value: "3"  # Default replication for new topics
            - name: KAFKA_MIN_INSYNC_REPLICAS
              value: "2"  # Minimum replicas for write acknowledgment
            # Retention settings
            - name: KAFKA_LOG_RETENTION_HOURS
              value: "168"  # Keep messages for 7 days
            - name: KAFKA_LOG_RETENTION_BYTES
              value: "10737418240"  # 10GB per partition
          command:
            - /bin/bash
            - -c
            - |
              # Generate broker ID from pod ordinal
              export KAFKA_BROKER_ID=$((${HOSTNAME##*-}))
              # Configure advertised listeners for client connections
              export KAFKA_ADVERTISED_LISTENERS="INTERNAL://${HOSTNAME}.kafka:9092,EXTERNAL://${HOSTNAME}.kafka.default.svc.cluster.local:9093"
              export KAFKA_LISTENERS="INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:9093"
              /etc/confluent/docker/run
          volumeMounts:
            - name: kafka-data
              mountPath: /var/lib/kafka
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2
              memory: 4Gi
          # Basic health check - verify broker is accepting connections
          livenessProbe:
            tcpSocket:
              port: 9092
            initialDelaySeconds: 60
            periodSeconds: 10
          readinessProbe:
            tcpSocket:
              port: 9092
            initialDelaySeconds: 30
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: kafka-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd  # SSD for log write performance
        resources:
          requests:
            storage: 100Gi
---
# Headless service for Kafka broker discovery
apiVersion: v1
kind: Service
metadata:
  name: kafka
spec:
  ports:
    - port: 9092
      name: internal
    - port: 9093
      name: external
  clusterIP: None
  selector:
    app: kafka
```

### Kafka with KRaft (No ZooKeeper)

KRaft mode is Kafka's new consensus protocol that eliminates the ZooKeeper dependency. This simplifies operations and improves scalability.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
        - name: kafka
          image: confluentinc/cp-kafka:7.5.0
          ports:
            - containerPort: 9092
              name: kafka
            - containerPort: 9093
              name: controller  # KRaft controller port
          env:
            # Enable combined broker and controller roles
            - name: KAFKA_PROCESS_ROLES
              value: "broker,controller"
            - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
              value: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
            - name: KAFKA_CONTROLLER_LISTENER_NAMES
              value: "CONTROLLER"
            - name: KAFKA_INTER_BROKER_LISTENER_NAME
              value: "PLAINTEXT"
            - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
              value: "3"
            # Cluster ID must be the same across all nodes
            - name: CLUSTER_ID
              value: "MkU3OEVBNTcwNTJENDM2Qk"  # Generate with kafka-storage.sh random-uuid
          command:
            - /bin/bash
            - -c
            - |
              # Generate node ID from pod ordinal
              export KAFKA_NODE_ID=$((${HOSTNAME##*-}))
              # Configure controller quorum voters (all nodes participate)
              export KAFKA_CONTROLLER_QUORUM_VOTERS="0@kafka-0.kafka:9093,1@kafka-1.kafka:9093,2@kafka-2.kafka:9093"
              export KAFKA_ADVERTISED_LISTENERS="PLAINTEXT://${HOSTNAME}.kafka:9092"
              export KAFKA_LISTENERS="PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093"
              /etc/confluent/docker/run
          volumeMounts:
            - name: kafka-data
              mountPath: /var/lib/kafka
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2
              memory: 4Gi
  volumeClaimTemplates:
    - metadata:
        name: kafka-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

### Strimzi Kafka Operator

For production Kafka, use an operator:

Strimzi is a CNCF project that provides a Kubernetes-native way to run Kafka. It handles complex operational tasks like rolling updates, certificate management, and scaling.

```bash
# Install Strimzi operator in the kafka namespace
kubectl create namespace kafka
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
```

This Kafka custom resource deploys a production-ready cluster with the operator managing all complexity.

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-cluster
  namespace: kafka
spec:
  kafka:
    version: 3.5.1
    replicas: 3
    listeners:
      # Internal listener without TLS
      - name: plain
        port: 9092
        type: internal
        tls: false
      # Internal listener with TLS
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      # Replication and durability settings
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      log.retention.hours: 168  # 7 days retention
    storage:
      type: persistent-claim
      size: 100Gi
      class: fast-ssd
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 2
        memory: 4Gi
  # ZooKeeper configuration (still required for some Kafka versions)
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      class: fast-ssd
  # Entity operator manages topics and users
  entityOperator:
    topicOperator: {}  # Enables Topic CRD
    userOperator: {}   # Enables User CRD
```

## Storage Considerations

### Storage Classes

Storage classes define the type and performance characteristics of persistent volumes. Use SSD-backed storage for database workloads.

```yaml
# AWS EBS gp3 (recommended for most workloads)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"       # Baseline IOPS
  throughput: "125"  # MB/s throughput
reclaimPolicy: Retain  # Don't delete PV when PVC is deleted
volumeBindingMode: WaitForFirstConsumer  # Wait for pod to schedule before provisioning
allowVolumeExpansion: true  # Allow resizing PVCs
---
# GCP SSD Persistent Disk
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### Backup with VolumeSnapshots

VolumeSnapshots provide point-in-time backups of persistent volumes. Use them for regular backups and before major changes.

```yaml
# Create a snapshot of a PostgreSQL data volume
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
spec:
  # VolumeSnapshotClass defines the snapshot provider
  volumeSnapshotClassName: csi-aws-vsc
  source:
    # Reference the PVC to snapshot
    persistentVolumeClaimName: postgres-data-postgres-0
```

## Pod Disruption Budgets

Always protect stateful workloads:

PDBs prevent voluntary disruptions (like node drains) from taking down too many pods at once. This maintains quorum for replicated systems.

```yaml
# PostgreSQL PDB - ensure at least 2 of 3 replicas are always available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
spec:
  minAvailable: 2  # Need 2/3 for Patroni quorum
  selector:
    matchLabels:
      app: postgres
---
# Kafka PDB - ensure at least 2 of 3 brokers are available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kafka-pdb
spec:
  minAvailable: 2  # Maintain ISR (in-sync replicas) during maintenance
  selector:
    matchLabels:
      app: kafka
```

## Monitoring Stateful Applications

### PostgreSQL Metrics

Prometheus integration for PostgreSQL uses a sidecar exporter that exposes database metrics for scraping.

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres
spec:
  selector:
    matchLabels:
      app: postgres
  endpoints:
    - port: metrics
      interval: 30s  # Scrape every 30 seconds
---
# Add postgres_exporter sidecar to your StatefulSet
- name: postgres-exporter
  image: prometheuscommunity/postgres-exporter
  ports:
    - containerPort: 9187
      name: metrics
  env:
    # Connection string for the exporter
    - name: DATA_SOURCE_NAME
      value: "postgresql://postgres:password@localhost:5432/postgres?sslmode=disable"
```

### Key Alerts

These PrometheusRules define alerts for common issues with stateful applications. Configure notification channels in Alertmanager.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: stateful-alerts
spec:
  groups:
    - name: stateful
      rules:
        # Alert when PostgreSQL replication is lagging
        - alert: PostgresReplicationLag
          expr: pg_replication_lag > 30
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "PostgreSQL replication lag is high"

        # Alert when Kafka partitions are under-replicated
        - alert: KafkaUnderReplicatedPartitions
          expr: kafka_server_replicamanager_underreplicatedpartitions > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Kafka has under-replicated partitions"

        # Alert when Redis is running out of memory
        - alert: RedisMemoryHigh
          expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Redis memory usage above 90%"
```

## Best Practices

1. **Use operators** - CloudNativePG, Strimzi, Redis Operator for production
2. **Set resource limits** - Prevent noisy neighbor problems
3. **Use PDBs** - Protect quorum during maintenance
4. **Enable persistence** - Always use persistent volumes
5. **Plan for backup** - Regular snapshots and off-cluster backups
6. **Monitor replication** - Alert on lag and failures
7. **Use anti-affinity** - Spread replicas across nodes
8. **Test failure scenarios** - Regularly kill pods and verify recovery

---

Stateful applications in Kubernetes require more planning than stateless workloads, but with proper StatefulSet configuration, storage classes, and operators, you can run production databases and message queues reliably. Start with operators for complex applications - they encode operational knowledge you'd otherwise have to learn the hard way.
