# How to Monitor Apache Cassandra Cluster Health, Compaction Throughput, and Read/Write Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cassandra, Compaction, Latency Monitoring

Description: Monitor Apache Cassandra cluster health, compaction throughput, and read/write latency using the OpenTelemetry Collector JMX receiver for cluster visibility.

Apache Cassandra is a distributed NoSQL database designed for high write throughput and horizontal scaling. Its performance depends on compaction (merging SSTables), read/write latency, and cluster-level health. Since Cassandra runs on the JVM and exposes metrics via JMX, the OpenTelemetry Collector's JMX receiver is the natural choice for collecting these metrics.

## Enabling JMX on Cassandra

Cassandra enables JMX by default on port 7199 for local connections. For remote monitoring, edit `cassandra-env.sh`:

```bash
# In conf/cassandra-env.sh
JVM_OPTS="$JVM_OPTS -Dcom.sun.management.jmxremote.port=7199"
JVM_OPTS="$JVM_OPTS -Dcom.sun.management.jmxremote.ssl=false"
JVM_OPTS="$JVM_OPTS -Dcom.sun.management.jmxremote.authenticate=false"
JVM_OPTS="$JVM_OPTS -Djava.rmi.server.hostname=0.0.0.0"
JVM_OPTS="$JVM_OPTS -Dcom.sun.management.jmxremote.rmi.port=7199"
```

For Docker:

```yaml
services:
  cassandra:
    image: cassandra:latest
    environment:
      JMX_PORT: 7199
      LOCAL_JMX: "no"
    ports:
      - "9042:9042"
      - "7199:7199"
```

## Collector Configuration

```yaml
receivers:
  jmx/cassandra:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: cassandra-node:7199
    target_system: cassandra
    collection_interval: 15s
    resource_attributes:
      cassandra.node: "node-1"
      cassandra.datacenter: "dc1"

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: cassandra
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [jmx/cassandra]
      processors: [resource, batch]
      exporters: [otlp]
```

## Cluster Health Metrics

### Node Status

Cassandra nodes can be in these states:
- **UN (Up Normal)**: Healthy and serving requests
- **DN (Down Normal)**: Node is down
- **UJ (Up Joining)**: Joining the cluster
- **UL (Up Leaving)**: Leaving the cluster

Check with `nodetool`:
```bash
nodetool status
```

### Key Health JMX Metrics

```
# Gossip status
org.apache.cassandra.net:type=FailureDetector
  DownEndpointCount    - Number of down nodes
  UpEndpointCount      - Number of up nodes

# Pending tasks (per stage)
org.apache.cassandra.internal:type=CompactionManager
  PendingTasks         - Compaction tasks waiting

# Dropped messages (critical indicator)
org.apache.cassandra.metrics:type=DroppedMessage,scope=*,name=Dropped
  Count                - Messages dropped (expired before processing)
```

Dropped messages mean Cassandra could not process requests within the timeout. This is a serious performance indicator.

## Compaction Metrics

### How Compaction Works

Cassandra writes data to SSTables (Sorted String Tables). Over time, multiple SSTables accumulate for the same partition. Compaction merges them into fewer, larger SSTables, removing deleted data (tombstones) and consolidating updates.

### Compaction JMX Metrics

```
# Compaction throughput
org.apache.cassandra.metrics:type=Compaction,name=BytesCompacted
  Count    - Total bytes compacted (cumulative)

# Pending compactions
org.apache.cassandra.metrics:type=Compaction,name=PendingTasks
  Value    - Number of pending compaction tasks

# Compaction task completion
org.apache.cassandra.metrics:type=Compaction,name=CompletedTasks
  Value    - Completed compaction tasks

# SSTable count (per table)
org.apache.cassandra.metrics:type=Table,keyspace=*,scope=*,name=LiveSSTableCount
  Value    - Number of SSTables for a table
```

### Compaction Throughput

```
compaction_throughput = rate(bytes_compacted[5m])
```

If compaction cannot keep up with writes, SSTable count grows, which degrades read performance because more files must be checked.

### Pending Compactions

```
pending_compactions = Compaction.PendingTasks
```

A growing pending compaction count indicates compaction is falling behind. Common causes: disk I/O saturation, too many concurrent compactions, or very large SSTables.

## Read/Write Latency Metrics

### Per-Table Latency

```
# Read latency
org.apache.cassandra.metrics:type=Table,keyspace=*,scope=*,name=ReadLatency
  Count    - Total read operations
  Mean     - Average read latency (microseconds)
  P99      - 99th percentile latency

# Write latency
org.apache.cassandra.metrics:type=Table,keyspace=*,scope=*,name=WriteLatency
  Count    - Total write operations
  Mean     - Average write latency (microseconds)
  P99      - 99th percentile latency
```

### Coordinator Latency

```
# Client-facing latency (includes network hops)
org.apache.cassandra.metrics:type=ClientRequest,scope=Read,name=Latency
org.apache.cassandra.metrics:type=ClientRequest,scope=Write,name=Latency
```

Coordinator latency is higher than table-level latency because it includes the time to coordinate reads/writes across replicas.

## Monitoring Multiple Nodes

```yaml
receivers:
  jmx/cassandra-1:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: cassandra-1:7199
    target_system: cassandra
    resource_attributes:
      cassandra.node: "node-1"

  jmx/cassandra-2:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: cassandra-2:7199
    target_system: cassandra
    resource_attributes:
      cassandra.node: "node-2"

  jmx/cassandra-3:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: cassandra-3:7199
    target_system: cassandra
    resource_attributes:
      cassandra.node: "node-3"

service:
  pipelines:
    metrics:
      receivers: [jmx/cassandra-1, jmx/cassandra-2, jmx/cassandra-3]
      processors: [resource, batch]
      exporters: [otlp]
```

## Alert Conditions

```yaml
# Node down
- alert: CassandraNodeDown
  condition: cassandra.failure_detector.down_endpoint_count > 0
  for: 2m
  severity: critical
  message: "{{ value }} Cassandra nodes are down"

# Pending compactions growing
- alert: CassandraPendingCompactions
  condition: cassandra.compaction.pending_tasks > 50
  for: 15m
  severity: warning
  message: "{{ value }} pending compactions on {{ node }}. Compaction may be falling behind."

# High read latency
- alert: CassandraHighReadLatency
  condition: cassandra.client_request.read.latency.p99 > 100000
  for: 10m
  severity: warning
  message: "Cassandra P99 read latency is {{ value_ms }}ms on {{ node }}"

# Dropped messages
- alert: CassandraDroppedMessages
  condition: rate(cassandra.dropped_message.count[5m]) > 0
  severity: critical
  message: "Cassandra is dropping messages on {{ node }}. Requests are timing out."

# High SSTable count per table
- alert: CassandraHighSSTableCount
  condition: cassandra.table.live_sstable_count > 50
  for: 30m
  severity: warning
  message: "Table {{ table }} has {{ value }} SSTables. Compaction may be needed."
```

## Summary

Cassandra monitoring with OpenTelemetry focuses on cluster health (node status, dropped messages), compaction performance (pending tasks, throughput, SSTable count), and read/write latency (per-table and coordinator-level). The JMX receiver collects all these metrics from Cassandra's MBeans. Alert on node failures, growing pending compactions, high latency percentiles, and dropped messages to catch cluster issues before they impact application performance. Monitor each node individually since Cassandra is a peer-to-peer system where any node can be a bottleneck.
