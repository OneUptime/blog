# How to Use ClickHouse Keeper Instead of ZooKeeper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, ZooKeeper, Coordination, Replication, High Availability, Database, Migration

Description: A comprehensive guide to setting up ClickHouse Keeper as a replacement for ZooKeeper, covering installation, configuration, migration from ZooKeeper, and operational best practices.

---

ClickHouse Keeper is a drop-in replacement for ZooKeeper, built specifically for ClickHouse. It provides the same coordination service with better integration, simpler operations, and improved performance. This guide covers how to set up and migrate to ClickHouse Keeper.

## Why ClickHouse Keeper?

### Advantages over ZooKeeper

```markdown
| Feature           | ZooKeeper    | ClickHouse Keeper |
|-------------------|--------------|-------------------|
| Language          | Java         | C++               |
| Memory footprint  | Higher       | Lower             |
| Configuration     | Complex      | Simpler           |
| ClickHouse-native | No           | Yes               |
| Log format        | Binary       | Human-readable    |
| Compression       | No           | Configurable      |
```

## Setting Up ClickHouse Keeper

### Standalone Keeper Configuration

```xml
<!-- /etc/clickhouse-keeper/config.xml -->
<clickhouse>
    <logger>
        <level>information</level>
        <log>/var/log/clickhouse-keeper/clickhouse-keeper.log</log>
        <errorlog>/var/log/clickhouse-keeper/clickhouse-keeper.err.log</errorlog>
        <size>1000M</size>
        <count>3</count>
    </logger>

    <listen_host>0.0.0.0</listen_host>

    <keeper_server>
        <tcp_port>2181</tcp_port>
        <server_id>1</server_id>

        <log_storage_path>/var/lib/clickhouse-keeper/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse-keeper/snapshots</snapshot_storage_path>

        <coordination_settings>
            <operation_timeout_ms>10000</operation_timeout_ms>
            <session_timeout_ms>30000</session_timeout_ms>
            <raft_logs_level>warning</raft_logs_level>
        </coordination_settings>

        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>keeper-1</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>2</id>
                <hostname>keeper-2</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>3</id>
                <hostname>keeper-3</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
```

### Embedded Keeper in ClickHouse Server

```xml
<!-- /etc/clickhouse-server/config.d/keeper.xml -->
<clickhouse>
    <keeper_server>
        <tcp_port>2181</tcp_port>
        <server_id>1</server_id>

        <log_storage_path>/var/lib/clickhouse/coordination/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse/coordination/snapshots</snapshot_storage_path>

        <coordination_settings>
            <operation_timeout_ms>10000</operation_timeout_ms>
            <session_timeout_ms>30000</session_timeout_ms>
        </coordination_settings>

        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>clickhouse-1</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>2</id>
                <hostname>clickhouse-2</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>3</id>
                <hostname>clickhouse-3</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
```

### Configure ClickHouse to Use Keeper

```xml
<!-- /etc/clickhouse-server/config.d/use_keeper.xml -->
<clickhouse>
    <zookeeper>
        <node>
            <host>keeper-1</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper-2</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper-3</host>
            <port>2181</port>
        </node>
        <session_timeout_ms>30000</session_timeout_ms>
    </zookeeper>
</clickhouse>
```

## Docker Compose Setup

### Three-Node Keeper Cluster

```yaml
version: '3.8'
services:
  keeper-1:
    image: clickhouse/clickhouse-keeper:latest
    hostname: keeper-1
    volumes:
      - ./config/keeper-1.xml:/etc/clickhouse-keeper/config.xml
      - keeper-1-data:/var/lib/clickhouse-keeper
    ports:
      - "2181:2181"
      - "9234:9234"

  keeper-2:
    image: clickhouse/clickhouse-keeper:latest
    hostname: keeper-2
    volumes:
      - ./config/keeper-2.xml:/etc/clickhouse-keeper/config.xml
      - keeper-2-data:/var/lib/clickhouse-keeper
    ports:
      - "2182:2181"
      - "9235:9234"

  keeper-3:
    image: clickhouse/clickhouse-keeper:latest
    hostname: keeper-3
    volumes:
      - ./config/keeper-3.xml:/etc/clickhouse-keeper/config.xml
      - keeper-3-data:/var/lib/clickhouse-keeper
    ports:
      - "2183:2181"
      - "9236:9234"

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    hostname: clickhouse
    volumes:
      - ./config/clickhouse.xml:/etc/clickhouse-server/config.d/keeper.xml
    depends_on:
      - keeper-1
      - keeper-2
      - keeper-3

volumes:
  keeper-1-data:
  keeper-2-data:
  keeper-3-data:
```

## Kubernetes Deployment

### StatefulSet for Keeper

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse-keeper
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
      containers:
        - name: keeper
          image: clickhouse/clickhouse-keeper:latest
          ports:
            - containerPort: 2181
              name: client
            - containerPort: 9234
              name: raft
          volumeMounts:
            - name: config
              mountPath: /etc/clickhouse-keeper/
            - name: data
              mountPath: /var/lib/clickhouse-keeper
          env:
            - name: KEEPER_SERVER_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
      volumes:
        - name: config
          configMap:
            name: keeper-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: clickhouse-keeper
spec:
  clusterIP: None
  ports:
    - port: 2181
      name: client
    - port: 9234
      name: raft
  selector:
    app: clickhouse-keeper
```

## Migration from ZooKeeper

### Pre-Migration Checklist

```bash
# 1. Check ZooKeeper data size
echo "stat" | nc zookeeper-1 2181

# 2. Backup ZooKeeper data
zkCli.sh -server zookeeper-1:2181 <<< "getAll /" > zk_backup.txt

# 3. Verify ClickHouse tables
clickhouse-client --query "SELECT database, table FROM system.replicas"
```

### Migration Steps

```bash
# 1. Set up Keeper cluster (do not start yet)
# Configure all keeper nodes

# 2. Export ZooKeeper data
clickhouse-keeper-converter --zookeeper-logs-dir /var/lib/zookeeper/version-2 \
    --zookeeper-snapshots-dir /var/lib/zookeeper/version-2 \
    --output-dir /var/lib/clickhouse-keeper

# 3. Copy converted data to all Keeper nodes
rsync -av /var/lib/clickhouse-keeper/ keeper-1:/var/lib/clickhouse-keeper/
rsync -av /var/lib/clickhouse-keeper/ keeper-2:/var/lib/clickhouse-keeper/
rsync -av /var/lib/clickhouse-keeper/ keeper-3:/var/lib/clickhouse-keeper/

# 4. Start Keeper cluster
systemctl start clickhouse-keeper

# 5. Verify Keeper is working
echo "stat" | nc keeper-1 2181
```

### Update ClickHouse Configuration

```xml
<!-- Replace zookeeper section with keeper endpoints -->
<clickhouse>
    <zookeeper>
        <!-- Remove old ZooKeeper nodes -->
        <!-- <node><host>zookeeper-1</host><port>2181</port></node> -->

        <!-- Add Keeper nodes -->
        <node>
            <host>keeper-1</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper-2</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper-3</host>
            <port>2181</port>
        </node>
    </zookeeper>
</clickhouse>
```

### Verify Migration

```sql
-- Check replica status
SELECT
    database,
    table,
    is_readonly,
    is_session_expired,
    queue_size,
    absolute_delay
FROM system.replicas;

-- Check Keeper path
SELECT *
FROM system.zookeeper
WHERE path = '/clickhouse';
```

## Monitoring ClickHouse Keeper

### Four Letter Commands

```bash
# Server status
echo "stat" | nc keeper-1 2181

# Configuration
echo "conf" | nc keeper-1 2181

# Is leader?
echo "isro" | nc keeper-1 2181

# Server info
echo "srvr" | nc keeper-1 2181

# Watch details
echo "wchc" | nc keeper-1 2181
```

### Prometheus Metrics

```xml
<!-- Enable metrics -->
<clickhouse>
    <keeper_server>
        <prometheus>
            <endpoint>/metrics</endpoint>
            <port>9363</port>
        </prometheus>
    </keeper_server>
</clickhouse>
```

### Key Metrics to Monitor

```sql
-- From ClickHouse
SELECT *
FROM system.zookeeper
WHERE path = '/clickhouse/task_queue';

-- Keeper client connections
SELECT
    metric,
    value
FROM system.metrics
WHERE metric LIKE '%ZooKeeper%';
```

## Operational Tasks

### Add New Keeper Node

```xml
<!-- 1. Add to raft_configuration on all nodes -->
<raft_configuration>
    <server>
        <id>1</id>
        <hostname>keeper-1</hostname>
        <port>9234</port>
    </server>
    <server>
        <id>2</id>
        <hostname>keeper-2</hostname>
        <port>9234</port>
    </server>
    <server>
        <id>3</id>
        <hostname>keeper-3</hostname>
        <port>9234</port>
    </server>
    <!-- New node -->
    <server>
        <id>4</id>
        <hostname>keeper-4</hostname>
        <port>9234</port>
    </server>
</raft_configuration>
```

```bash
# 2. Rolling restart existing nodes
systemctl restart clickhouse-keeper

# 3. Start new node (it will sync automatically)
systemctl start clickhouse-keeper
```

### Remove Keeper Node

```bash
# 1. Remove from configuration on all nodes
# Edit raft_configuration

# 2. Stop the node being removed
systemctl stop clickhouse-keeper

# 3. Rolling restart remaining nodes
systemctl restart clickhouse-keeper
```

### Backup and Restore

```bash
# Backup
cp -r /var/lib/clickhouse-keeper/snapshots /backup/keeper-snapshots
cp -r /var/lib/clickhouse-keeper/log /backup/keeper-log

# Restore
systemctl stop clickhouse-keeper
rm -rf /var/lib/clickhouse-keeper/*
cp -r /backup/keeper-snapshots /var/lib/clickhouse-keeper/snapshots
cp -r /backup/keeper-log /var/lib/clickhouse-keeper/log
systemctl start clickhouse-keeper
```

## Performance Tuning

### Coordination Settings

```xml
<coordination_settings>
    <!-- Raft heartbeat interval -->
    <heart_beat_interval_ms>500</heart_beat_interval_ms>

    <!-- Election timeout -->
    <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
    <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>

    <!-- Snapshot frequency -->
    <snapshot_distance>100000</snapshot_distance>

    <!-- Log compaction -->
    <reserved_log_items>100000</reserved_log_items>

    <!-- Operation timeout -->
    <operation_timeout_ms>10000</operation_timeout_ms>

    <!-- Session timeout -->
    <session_timeout_ms>30000</session_timeout_ms>
</coordination_settings>
```

### Storage Configuration

```xml
<keeper_server>
    <!-- Use separate disks for log and snapshots -->
    <log_storage_path>/mnt/fast-ssd/keeper/log</log_storage_path>
    <snapshot_storage_path>/mnt/storage/keeper/snapshots</snapshot_storage_path>

    <!-- Compression -->
    <compress_logs>true</compress_logs>
    <compress_snapshots_with_zstd_format>true</compress_snapshots_with_zstd_format>
</keeper_server>
```

## Troubleshooting

### Common Issues

```bash
# Leader election issues
echo "stat" | nc keeper-1 2181 | grep Mode

# Check for split brain
for h in keeper-1 keeper-2 keeper-3; do
    echo "$h: $(echo 'stat' | nc $h 2181 | grep Mode)"
done

# Session expired errors
# Increase session_timeout_ms

# Slow operations
# Check network latency between keeper nodes
ping keeper-2
```

### Recovery from Failure

```bash
# Single node failure
# Node will rejoin automatically after restart
systemctl start clickhouse-keeper

# Majority failure
# 1. Stop all remaining nodes
# 2. Identify node with latest data
ls -la /var/lib/clickhouse-keeper/log/
# 3. Start that node first, then others
```

---

ClickHouse Keeper is the recommended coordination service for ClickHouse deployments. It provides the same functionality as ZooKeeper with better performance and simpler operations. Start new deployments with Keeper, and migrate existing ZooKeeper clusters using the converter tool. Always run an odd number of Keeper nodes (3 or 5) for proper quorum.
