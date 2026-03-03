# How to Deploy Cassandra on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cassandra, Kubernetes, NoSQL, Distributed Database, DevOps

Description: Deploy Apache Cassandra on Talos Linux with multi-node clusters, persistent storage, and production tuning for wide-column workloads.

---

Apache Cassandra is a distributed wide-column database built for handling large volumes of data across many nodes with no single point of failure. Its peer-to-peer architecture means every node is equal, which aligns nicely with the Kubernetes model. Running Cassandra on Talos Linux gives you an immutable host OS that reduces operational surprises while Cassandra handles data distribution and replication across your cluster.

This guide covers deploying Cassandra on Talos Linux, from basic setup to production-ready configurations.

## Why Cassandra on Talos Linux

Cassandra thrives in environments where nodes can be added or removed without downtime. Talos Linux supports this by providing consistent, reproducible nodes that boot into a known state every time. When you need to add capacity to your Cassandra ring, you simply add more Talos nodes and scale the StatefulSet. The immutable OS ensures that every node running Cassandra has an identical foundation.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- Each node needs 8GB+ RAM and SSD storage
- `kubectl` and `talosctl` installed
- A StorageClass configured for persistent volumes

## Step 1: Configure Talos Linux for Cassandra

Cassandra has specific system requirements that need to be configured at the OS level:

```yaml
# talos-cassandra-patch.yaml
machine:
  sysctls:
    # Cassandra needs higher file descriptor limits
    vm.max_map_count: "1048575"
    net.core.somaxconn: "65535"
    net.ipv4.tcp_keepalive_time: "60"
    net.ipv4.tcp_keepalive_probes: "3"
    net.ipv4.tcp_keepalive_intvl: "10"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/cassandra-data
```

```bash
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4 \
  --file talos-cassandra-patch.yaml
```

## Step 2: Create Namespace and Configuration

```yaml
# cassandra-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cassandra
---
# cassandra-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cassandra-config
  namespace: cassandra
data:
  cassandra-env.sh: |
    # JVM heap settings - adjust based on your node resources
    MAX_HEAP_SIZE="2G"
    HEAP_NEWSIZE="400M"
  jvm.options: |
    -Xms2G
    -Xmx2G
    -Xmn400M
    -XX:+UseG1GC
    -XX:MaxGCPauseMillis=500
    -XX:+ParallelRefProcEnabled
```

```bash
kubectl apply -f cassandra-namespace.yaml
kubectl apply -f cassandra-config.yaml
```

## Step 3: Deploy Cassandra StatefulSet

```yaml
# cassandra-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
  namespace: cassandra
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      terminationGracePeriodSeconds: 1800
      containers:
        - name: cassandra
          image: cassandra:4.1
          ports:
            - containerPort: 7000
              name: intra-node
            - containerPort: 7001
              name: tls-intra-node
            - containerPort: 7199
              name: jmx
            - containerPort: 9042
              name: cql
          env:
            - name: MAX_HEAP_SIZE
              value: "2G"
            - name: HEAP_NEWSIZE
              value: "400M"
            - name: CASSANDRA_SEEDS
              value: "cassandra-0.cassandra.cassandra.svc.cluster.local"
            - name: CASSANDRA_CLUSTER_NAME
              value: "TalosCluster"
            - name: CASSANDRA_DC
              value: "dc1"
            - name: CASSANDRA_RACK
              value: "rack1"
            - name: CASSANDRA_ENDPOINT_SNITCH
              value: "GossipingPropertyFileSnitch"
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          volumeMounts:
            - name: cassandra-data
              mountPath: /var/lib/cassandra
          resources:
            requests:
              memory: "4Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          # Cassandra takes time to start - use generous timeouts
          readinessProbe:
            exec:
              command:
                - /bin/bash
                - -c
                - nodetool status | grep -E "^UN"
            initialDelaySeconds: 60
            periodSeconds: 15
            timeoutSeconds: 10
          livenessProbe:
            exec:
              command:
                - /bin/bash
                - -c
                - nodetool status
            initialDelaySeconds: 120
            periodSeconds: 30
            timeoutSeconds: 10
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - cassandra
              topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
    - metadata:
        name: cassandra-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 100Gi
```

## Step 4: Create Services

```yaml
# cassandra-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  namespace: cassandra
spec:
  selector:
    app: cassandra
  ports:
    - port: 9042
      targetPort: 9042
      name: cql
    - port: 7000
      targetPort: 7000
      name: intra-node
    - port: 7001
      targetPort: 7001
      name: tls-intra-node
    - port: 7199
      targetPort: 7199
      name: jmx
  clusterIP: None
```

```bash
kubectl apply -f cassandra-statefulset.yaml
kubectl apply -f cassandra-service.yaml

# Wait for pods (Cassandra starts slowly)
kubectl rollout status statefulset/cassandra -n cassandra --timeout=600s
```

## Step 5: Verify the Cluster

```bash
# Check cluster status using nodetool
kubectl exec -it cassandra-0 -n cassandra -- nodetool status

# Expected output should show all nodes as UN (Up/Normal)
# Datacenter: dc1
# Status=Up/Down  State=Normal/Leaving/Joining/Moving
# UN  10.244.1.5  256  ?  rack1
# UN  10.244.2.5  256  ?  rack1
# UN  10.244.3.5  256  ?  rack1
```

## Step 6: Create Keyspace and Tables

```bash
# Connect to Cassandra using cqlsh
kubectl exec -it cassandra-0 -n cassandra -- cqlsh
```

```sql
-- Create a keyspace with replication factor 3
CREATE KEYSPACE myapp WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3
};

USE myapp;

-- Create a table
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  username TEXT,
  email TEXT,
  created_at TIMESTAMP
);

-- Insert data
INSERT INTO users (user_id, username, email, created_at)
VALUES (uuid(), 'alice', 'alice@example.com', toTimestamp(now()));

-- Query data
SELECT * FROM users;
```

## Using the K8ssandra Operator

For production deployments, the K8ssandra Operator provides a comprehensive solution:

```bash
# Install K8ssandra operator using Helm
helm repo add k8ssandra https://helm.k8ssandra.io/stable
helm repo update

helm install k8ssandra-operator k8ssandra/k8ssandra-operator \
  --namespace cassandra
```

```yaml
# k8ssandra-cluster.yaml
apiVersion: k8ssandra.io/v1alpha1
kind: K8ssandraCluster
metadata:
  name: cassandra-prod
  namespace: cassandra
spec:
  cassandra:
    serverVersion: "4.1.0"
    datacenters:
      - metadata:
          name: dc1
        size: 3
        storageConfig:
          cassandraDataVolumeClaimSpec:
            storageClassName: local-path
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 100Gi
        config:
          jvmOptions:
            heapSize: 2G
        resources:
          requests:
            memory: 4Gi
            cpu: 1000m
    mgmtAPIHeap: 64Mi
  stargate:
    size: 1
    heapSize: 256M
  reaper:
    autoScheduling:
      enabled: true
```

K8ssandra bundles Cassandra with Stargate (REST/GraphQL API), Reaper (anti-entropy repair tool), and Medusa (backup/restore). This significantly reduces the operational effort for managing Cassandra in production.

## Backup Strategy

```yaml
# cassandra-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cassandra-snapshot
  namespace: cassandra
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: snapshot
              image: cassandra:4.1
              command:
                - /bin/bash
                - -c
                - |
                  nodetool -h cassandra-0.cassandra snapshot -t daily-$(date +%Y%m%d)
                  nodetool -h cassandra-1.cassandra snapshot -t daily-$(date +%Y%m%d)
                  nodetool -h cassandra-2.cassandra snapshot -t daily-$(date +%Y%m%d)
          restartPolicy: OnFailure
```

## Performance Considerations

When running Cassandra on Talos Linux, pay attention to:

- **Storage performance**: Cassandra is write-heavy and benefits enormously from SSDs. Use local SSDs when possible.
- **JVM tuning**: Set heap size to no more than 8GB. G1GC is recommended for heaps over 4GB.
- **Compaction strategy**: Choose the right compaction strategy based on your workload (SizeTiered for write-heavy, Leveled for read-heavy).
- **Network**: Ensure low-latency networking between nodes for gossip protocol performance.

## Conclusion

Cassandra on Talos Linux creates a robust, self-healing data layer for applications that need to handle massive amounts of data with high write throughput. The key is to be patient during deployment since Cassandra takes longer to bootstrap compared to other databases, properly configure JVM settings for your available resources, and use pod anti-affinity to spread nodes across physical hosts. For production environments, the K8ssandra Operator provides the automation needed for repairs, backups, and lifecycle management that make running Cassandra sustainable long-term.
