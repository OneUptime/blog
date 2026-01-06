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

```yaml
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
  clusterIP: None  # Headless service
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
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
            - name: POSTGRES_DB
              value: myapp
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
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 5
            periodSeconds: 5
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

### PostgreSQL HA with Patroni

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
data:
  PATRONI_KUBERNETES_LABELS: "{app: postgres}"
  PATRONI_KUBERNETES_NAMESPACE: default
  PATRONI_KUBERNETES_USE_ENDPOINTS: "true"
  PATRONI_NAME: postgres
  PATRONI_POSTGRESQL_DATA_DIR: /var/lib/postgresql/data/pgdata
  PATRONI_POSTGRESQL_PGPASS: /tmp/pgpass
  PATRONI_REPLICATION_USERNAME: replicator
  PATRONI_SUPERUSER_USERNAME: postgres
  PATRONI_SCOPE: postgres-cluster
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      serviceAccountName: postgres
      containers:
        - name: postgres
          image: patroni:latest
          ports:
            - containerPort: 5432
              name: postgres
            - containerPort: 8008
              name: patroni
          envFrom:
            - configMapRef:
                name: postgres-config
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

```bash
# Install PostgreSQL Operator
helm repo add postgres-operator https://opensource.zalando.com/postgres-operator/charts/postgres-operator
helm install postgres-operator postgres-operator/postgres-operator
```

```yaml
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: myapp-postgres
spec:
  teamId: myteam
  volume:
    size: 100Gi
    storageClass: fast-ssd
  numberOfInstances: 3
  users:
    myapp: []
  databases:
    myapp: myapp
  postgresql:
    version: "15"
    parameters:
      max_connections: "200"
      shared_buffers: 1GB
      effective_cache_size: 3GB
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

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
    - port: 6379
  clusterIP: None
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
            - /etc/redis/redis.conf
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 1Gi
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
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    maxmemory 900mb
    maxmemory-policy allkeys-lru
```

### Redis Cluster (6 nodes)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    appendfsync everysec
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6
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
              name: client
            - containerPort: 16379
              name: gossip
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

```bash
# Get pod IPs
kubectl get pods -l app=redis-cluster -o jsonpath='{range.items[*]}{.status.podIP}:6379 {end}'

# Create cluster (run from any redis pod)
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

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      initContainers:
        - name: config
          image: redis:7
          command: ["/bin/sh", "-c"]
          args:
            - |
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
        - name: redis-config-templates
          configMap:
            name: redis-config
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

```yaml
# ZooKeeper
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
spec:
  serviceName: zookeeper
  replicas: 3
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
              name: client
            - containerPort: 2888
              name: server
            - containerPort: 3888
              name: leader-election
          env:
            - name: ZOOKEEPER_CLIENT_PORT
              value: "2181"
            - name: ZOOKEEPER_TICK_TIME
              value: "2000"
            - name: ZOOKEEPER_SERVER_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          command:
            - /bin/bash
            - -c
            - |
              export ZOOKEEPER_SERVER_ID=$((${HOSTNAME##*-} + 1))
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
# Kafka
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
          env:
            - name: KAFKA_ZOOKEEPER_CONNECT
              value: "zookeeper-0.zookeeper:2181,zookeeper-1.zookeeper:2181,zookeeper-2.zookeeper:2181"
            - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
              value: "INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT"
            - name: KAFKA_INTER_BROKER_LISTENER_NAME
              value: "INTERNAL"
            - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
              value: "3"
            - name: KAFKA_DEFAULT_REPLICATION_FACTOR
              value: "3"
            - name: KAFKA_MIN_INSYNC_REPLICAS
              value: "2"
            - name: KAFKA_LOG_RETENTION_HOURS
              value: "168"
            - name: KAFKA_LOG_RETENTION_BYTES
              value: "10737418240"
          command:
            - /bin/bash
            - -c
            - |
              export KAFKA_BROKER_ID=$((${HOSTNAME##*-}))
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
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
---
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
              name: controller
          env:
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
            - name: CLUSTER_ID
              value: "MkU3OEVBNTcwNTJENDM2Qk"
          command:
            - /bin/bash
            - -c
            - |
              export KAFKA_NODE_ID=$((${HOSTNAME##*-}))
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

```bash
# Install Strimzi
kubectl create namespace kafka
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
```

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
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      log.retention.hours: 168
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
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      class: fast-ssd
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

## Storage Considerations

### Storage Classes

```yaml
# AWS EBS gp3 (recommended)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# GCP SSD
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

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: postgres-data-postgres-0
```

## Pod Disruption Budgets

Always protect stateful workloads:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: postgres
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kafka-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: kafka
```

## Monitoring Stateful Applications

### PostgreSQL Metrics

```yaml
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
      interval: 30s
---
# Add postgres_exporter sidecar
- name: postgres-exporter
  image: prometheuscommunity/postgres-exporter
  ports:
    - containerPort: 9187
      name: metrics
  env:
    - name: DATA_SOURCE_NAME
      value: "postgresql://postgres:password@localhost:5432/postgres?sslmode=disable"
```

### Key Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: stateful-alerts
spec:
  groups:
    - name: stateful
      rules:
        - alert: PostgresReplicationLag
          expr: pg_replication_lag > 30
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "PostgreSQL replication lag is high"

        - alert: KafkaUnderReplicatedPartitions
          expr: kafka_server_replicamanager_underreplicatedpartitions > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Kafka has under-replicated partitions"

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
