# How to Deploy ClickHouse Keeper Cluster on Kubernetes for ZooKeeper Replacement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ClickHouse, ClickHouse Keeper

Description: Replace ZooKeeper with ClickHouse Keeper for ClickHouse cluster coordination on Kubernetes using a lightweight, Raft-based consensus system.

---

ClickHouse Keeper provides a lightweight alternative to ZooKeeper for coordinating ClickHouse clusters. Built using the Raft consensus algorithm, Keeper is specifically designed for ClickHouse's needs with simpler configuration and better integration. When deployed on Kubernetes, Keeper eliminates the operational complexity of managing separate ZooKeeper clusters. This guide shows you how to deploy ClickHouse with Keeper for production workloads.

## Why Replace ZooKeeper with Keeper

ZooKeeper adds operational overhead with its Java runtime, complex configuration, and separate upgrade cycles. ClickHouse Keeper eliminates these issues with a C++ implementation that integrates directly into ClickHouse, uses less memory, and requires minimal configuration.

Keeper implements the same protocol as ZooKeeper, making it a drop-in replacement. However, it's optimized specifically for ClickHouse's coordination patterns, resulting in better performance and reliability.

## Deploying ClickHouse Keeper

Create a three-node Keeper ensemble:

```yaml
# clickhouse-keeper.yaml
apiVersion: v1
kind: Service
metadata:
  name: clickhouse-keeper
  namespace: clickhouse
spec:
  clusterIP: None
  selector:
    app: clickhouse-keeper
  ports:
  - port: 9181
    name: client
  - port: 9234
    name: raft
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse-keeper
  namespace: clickhouse
spec:
  serviceName: clickhouse-keeper
  replicas: 3
  selector:
    matchLabels:
      app: clickhouse-keeper
  template:
    metadata:
      labels:
        app: clickhouse-keeper
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: clickhouse-keeper
            topologyKey: kubernetes.io/hostname

      containers:
      - name: keeper
        image: clickhouse/clickhouse-server:23.12
        command:
        - clickhouse-keeper
        - --config-file=/etc/clickhouse-keeper/keeper.xml

        ports:
        - containerPort: 9181
          name: client
        - containerPort: 9234
          name: raft

        volumeMounts:
        - name: config
          mountPath: /etc/clickhouse-keeper
        - name: data
          mountPath: /var/lib/clickhouse-keeper
        - name: logs
          mountPath: /var/log/clickhouse-keeper

        livenessProbe:
          exec:
            command:
            - bash
            - -c
            - "echo ruok | nc localhost 9181 | grep imok"
          initialDelaySeconds: 10
          periodSeconds: 10

        readinessProbe:
          exec:
            command:
            - bash
            - -c
            - "echo stat | nc localhost 9181"
          initialDelaySeconds: 5
          periodSeconds: 5

        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1
            memory: 1Gi

      volumes:
      - name: config
        configMap:
          name: clickhouse-keeper-config

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
  - metadata:
      name: logs
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
```

Create the Keeper configuration:

```yaml
# clickhouse-keeper-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: clickhouse-keeper-config
  namespace: clickhouse
data:
  keeper.xml: |
    <clickhouse>
        <keeper_server>
            <tcp_port>9181</tcp_port>
            <server_id from_env="KEEPER_SERVER_ID" />

            <log_storage_path>/var/lib/clickhouse-keeper/coordination/log</log_storage_path>
            <snapshot_storage_path>/var/lib/clickhouse-keeper/coordination/snapshots</snapshot_storage_path>

            <coordination_settings>
                <operation_timeout_ms>10000</operation_timeout_ms>
                <session_timeout_ms>30000</session_timeout_ms>
                <raft_logs_level>information</raft_logs_level>
                <rotate_log_storage_interval>10000</rotate_log_storage_interval>
                <snapshot_distance>10000</snapshot_distance>
                <snapshots_to_keep>3</snapshots_to_keep>
                <stale_log_gap>10000</stale_log_gap>
                <fresh_log_gap>200</fresh_log_gap>
                <heart_beat_interval_ms>500</heart_beat_interval_ms>
                <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
                <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>
            </coordination_settings>

            <raft_configuration>
                <server>
                    <id>1</id>
                    <hostname>clickhouse-keeper-0.clickhouse-keeper.clickhouse.svc.cluster.local</hostname>
                    <port>9234</port>
                </server>
                <server>
                    <id>2</id>
                    <hostname>clickhouse-keeper-1.clickhouse-keeper.clickhouse.svc.cluster.local</hostname>
                    <port>9234</port>
                </server>
                <server>
                    <id>3</id>
                    <hostname>clickhouse-keeper-2.clickhouse-keeper.clickhouse.svc.cluster.local</hostname>
                    <port>9234</port>
                </server>
            </raft_configuration>
        </keeper_server>

        <logger>
            <level>information</level>
            <log>/var/log/clickhouse-keeper/keeper.log</log>
            <errorlog>/var/log/clickhouse-keeper/keeper.err.log</errorlog>
            <size>100M</size>
            <count>10</count>
        </logger>
    </clickhouse>
```

Update the StatefulSet to set server ID:

```yaml
# Add to keeper container env
env:
- name: KEEPER_SERVER_ID
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
  value: |
    {{ if eq .Values.name "clickhouse-keeper-0" }}1{{ end }}
    {{ if eq .Values.name "clickhouse-keeper-1" }}2{{ end }}
    {{ if eq .Values.name "clickhouse-keeper-2" }}3{{ end }}
```

A better approach using init container:

```yaml
initContainers:
- name: set-server-id
  image: busybox
  command:
  - sh
  - -c
  - |
    # Extract ordinal from pod name
    ORDINAL=${HOSTNAME##*-}
    SERVER_ID=$((ORDINAL + 1))
    echo $SERVER_ID > /tmp/server-id
  volumeMounts:
  - name: tmp
    mountPath: /tmp
```

Deploy Keeper:

```bash
kubectl create namespace clickhouse
kubectl apply -f clickhouse-keeper-config.yaml
kubectl apply -f clickhouse-keeper.yaml

# Wait for all pods to be ready
kubectl get pods -n clickhouse -l app=clickhouse-keeper -w
```

## Deploying ClickHouse with Keeper

Create a ClickHouse cluster that uses Keeper:

```yaml
# clickhouse-cluster.yaml
apiVersion: v1
kind: Service
metadata:
  name: clickhouse
  namespace: clickhouse
spec:
  clusterIP: None
  selector:
    app: clickhouse
  ports:
  - port: 9000
    name: native
  - port: 8123
    name: http
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse
  namespace: clickhouse
spec:
  serviceName: clickhouse
  replicas: 3
  selector:
    matchLabels:
      app: clickhouse
  template:
    metadata:
      labels:
        app: clickhouse
    spec:
      containers:
      - name: clickhouse
        image: clickhouse/clickhouse-server:23.12
        ports:
        - containerPort: 9000
          name: native
        - containerPort: 8123
          name: http
        - containerPort: 9009
          name: interserver

        volumeMounts:
        - name: config
          mountPath: /etc/clickhouse-server/config.d
        - name: data
          mountPath: /var/lib/clickhouse
        - name: logs
          mountPath: /var/log/clickhouse-server

        resources:
          requests:
            cpu: 2
            memory: 4Gi
          limits:
            cpu: 4
            memory: 8Gi

      volumes:
      - name: config
        configMap:
          name: clickhouse-config

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: logs
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Configure ClickHouse to use Keeper:

```yaml
# clickhouse-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: clickhouse-config
  namespace: clickhouse
data:
  use-keeper.xml: |
    <clickhouse>
        <!-- Use Keeper instead of ZooKeeper -->
        <zookeeper>
            <node>
                <host>clickhouse-keeper-0.clickhouse-keeper.clickhouse.svc.cluster.local</host>
                <port>9181</port>
            </node>
            <node>
                <host>clickhouse-keeper-1.clickhouse-keeper.clickhouse.svc.cluster.local</host>
                <port>9181</port>
            </node>
            <node>
                <host>clickhouse-keeper-2.clickhouse-keeper.clickhouse.svc.cluster.local</host>
                <port>9181</port>
            </node>

            <session_timeout_ms>30000</session_timeout_ms>
            <operation_timeout_ms>10000</operation_timeout_ms>
        </zookeeper>

        <!-- Cluster configuration -->
        <remote_servers>
            <cluster_3shards_1replica>
                <shard>
                    <replica>
                        <host>clickhouse-0.clickhouse.clickhouse.svc.cluster.local</host>
                        <port>9000</port>
                    </replica>
                </shard>
                <shard>
                    <replica>
                        <host>clickhouse-1.clickhouse.clickhouse.svc.cluster.local</host>
                        <port>9000</port>
                    </replica>
                </shard>
                <shard>
                    <replica>
                        <host>clickhouse-2.clickhouse.clickhouse.svc.cluster.local</host>
                        <port>9000</port>
                    </replica>
                </shard>
            </cluster_3shards_1replica>
        </remote_servers>

        <!-- Macros for table creation -->
        <macros>
            <shard from_env="SHARD_ID"></shard>
            <replica from_env="REPLICA_ID"></replica>
        </macros>

        <!-- Distributed DDL -->
        <distributed_ddl>
            <path>/clickhouse/task_queue/ddl</path>
        </distributed_ddl>
    </clickhouse>
```

Deploy ClickHouse:

```bash
kubectl apply -f clickhouse-config.yaml
kubectl apply -f clickhouse-cluster.yaml
```

## Creating Replicated Tables

Connect to ClickHouse and create a replicated table:

```sql
-- Connect to any ClickHouse node
kubectl exec -it clickhouse-0 -n clickhouse -- clickhouse-client

-- Create a replicated table
CREATE TABLE events_local ON CLUSTER cluster_3shards_1replica
(
    event_time DateTime,
    user_id UInt64,
    event_type String,
    value Float64
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);

-- Create distributed table
CREATE TABLE events ON CLUSTER cluster_3shards_1replica
AS events_local
ENGINE = Distributed(cluster_3shards_1replica, default, events_local, rand());

-- Insert data
INSERT INTO events VALUES
    (now(), 1, 'click', 1.5),
    (now(), 2, 'view', 2.3),
    (now(), 3, 'purchase', 99.99);

-- Query distributed table
SELECT count(*) FROM events;
```

## Monitoring Keeper Health

Check Keeper status:

```bash
# Check if Keeper is responding
kubectl exec -n clickhouse clickhouse-keeper-0 -- \
  bash -c "echo ruok | nc localhost 9181"

# Get detailed status
kubectl exec -n clickhouse clickhouse-keeper-0 -- \
  bash -c "echo stat | nc localhost 9181"

# Check which node is leader
kubectl exec -n clickhouse clickhouse-keeper-0 -- \
  bash -c "echo srvr | nc localhost 9181" | grep Mode

# View Keeper logs
kubectl logs -f clickhouse-keeper-0 -n clickhouse
```

Query Keeper status from ClickHouse:

```sql
-- Check ZooKeeper (Keeper) status
SELECT * FROM system.zookeeper WHERE path = '/';

-- View Keeper cluster members
SELECT * FROM system.zookeeper WHERE path = '/keeper';

-- Check connection status
SELECT * FROM system.zookeeper_connection;
```

## Handling Keeper Failures

Keeper tolerates minority node failures. With three nodes, the cluster remains operational if one fails:

```bash
# Delete a pod to simulate failure
kubectl delete pod clickhouse-keeper-1 -n clickhouse

# Check cluster still responds
kubectl exec -n clickhouse clickhouse-keeper-0 -- \
  bash -c "echo ruok | nc localhost 9181"

# Pod will be recreated automatically
kubectl get pods -n clickhouse -l app=clickhouse-keeper -w
```

The remaining nodes elect a new leader if the failed node was the leader. Operations continue without interruption.

## Scaling Keeper Ensemble

While three nodes suffice for most deployments, you can scale to five for higher availability:

```bash
# Scale to 5 replicas
kubectl scale statefulset clickhouse-keeper -n clickhouse --replicas=5
```

Update the configuration to include new nodes:

```yaml
# Add to keeper.xml
<server>
    <id>4</id>
    <hostname>clickhouse-keeper-3.clickhouse-keeper.clickhouse.svc.cluster.local</hostname>
    <port>9234</port>
</server>
<server>
    <id>5</id>
    <hostname>clickhouse-keeper-4.clickhouse-keeper.clickhouse.svc.cluster.local</hostname>
    <port>9234</port>
</server>
```

Keeper supports dynamic reconfiguration, but it's safer to add nodes during low-traffic periods.

## Migrating from ZooKeeper to Keeper

If you're running ClickHouse with ZooKeeper, migrate to Keeper:

1. Deploy Keeper alongside existing ZooKeeper
2. Update ClickHouse configuration to point to Keeper
3. Rolling restart ClickHouse nodes
4. Verify replication works correctly
5. Decommission ZooKeeper

Migration configuration:

```yaml
<clickhouse>
    <zookeeper>
        <!-- New Keeper nodes -->
        <node>
            <host>clickhouse-keeper-0.clickhouse-keeper</host>
            <port>9181</port>
        </node>
        <!-- Add more Keeper nodes -->
    </zookeeper>
</clickhouse>
```

## Performance Tuning

Optimize Keeper performance:

```xml
<coordination_settings>
    <!-- Adjust based on workload -->
    <raft_logs_level>warning</raft_logs_level>
    <rotate_log_storage_interval>100000</rotate_log_storage_interval>
    <snapshot_distance>75000</snapshot_distance>

    <!-- Network timeouts -->
    <heart_beat_interval_ms>500</heart_beat_interval_ms>
    <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
    <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>

    <!-- Reduce for faster convergence in small clusters -->
    <reserved_log_items>100000</reserved_log_items>
    <snapshot_distance>75000</snapshot_distance>
</coordination_settings>
```

Monitor performance metrics:

```sql
-- Check Keeper latency from ClickHouse
SELECT * FROM system.zookeeper_log
ORDER BY event_time DESC
LIMIT 100;
```

## Conclusion

ClickHouse Keeper simplifies cluster coordination by eliminating ZooKeeper dependencies. With its Raft-based consensus, native ClickHouse integration, and reduced resource requirements, Keeper provides a more efficient solution for production deployments. The Kubernetes deployment model with StatefulSets ensures high availability while simplifying operations. By properly configuring Keeper settings, monitoring cluster health, and following best practices for replication, you build a robust foundation for distributed ClickHouse clusters that scale reliably with minimal operational overhead.
