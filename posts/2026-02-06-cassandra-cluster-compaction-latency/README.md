# How to Monitor Apache Cassandra Cluster Health, Compaction Throughput,

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cassandra, Compaction, Latency Monitoring

Description: Monitor Apache Cassandra cluster health, compaction throughput, and read/write latency using the OpenTelemetry Collector JMX receiver for cluster visibility.

Apache Cassandra is a distributed NoSQL database designed for high write throughput and horizontal scaling. Its performance depends on compaction (merging SSTables), read/write latency, and cluster-level health. Since Cassandra runs on the JVM and exposes metrics via JMX, the OpenTelemetry Collector's JMX receiver is the natural choice for collecting these metrics.

## Enabling JMX on Cassandra

Cassandra enables JMX by default on port 7199 for local connections. For remote monitoring, edit `cassandra-env.sh`:

```bash
# In conf/cassandra-env.sh

LOCAL_JMX=no
JMX_PORT=7199

JVM_OPTS="$JVM_OPTS -Djava.rmi.server.hostname=<cassandra-node-hostname-or-ip>"
JVM_OPTS="$JVM_OPTS -Dcom.sun.management.jmxremote.rmi.port=$JMX_PORT"
```

When enabling remote JMX, keep JMX authentication enabled and use SSL where possible.

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
    jar_path: /opt/opentelemetry-java-contrib-jmx-metrics.jar
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

```text
# Gossip status
org.apache.cassandra.net:type=FailureDetector
  DownEndpointCount    - Number of down nodes
  UpEndpointCount      - Number of up nodes

# Pending tasks (compaction executor thread pool)
org.apache.cassandra.metrics:type=ThreadPools,path=internal,scope=CompactionExecutor,name=PendingTasks
  Value                - Compaction tasks waiting

# Dropped messages (critical indicator)
org.apache.cassandra.metrics:type=DroppedMessage,scope=*,name=Dropped
  Count                - Messages dropped (expired before processing)
```

Dropped messages mean Cassandra could not process requests within the timeout. This is a serious performance indicator.

## Compaction Metrics

### How Compaction Works

Cassandra writes data to SSTables (Sorted String Tables). Over time, multiple SSTables accumulate for the same partition. Compaction merges them into fewer, larger SSTables, removing deleted data (tombstones) and consolidating updates.

### Compaction JMX Metrics

```text
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

```text
compaction_throughput = rate(custom.cassandra.compaction.bytes_compacted[5m])
```

If compaction cannot keep up with writes, SSTable count grows, which degrades read performance because more files must be checked.

### Pending Compactions

```text
pending_compactions = cassandra.compaction.tasks.pending
```

A growing pending compaction count indicates compaction is falling behind. Common causes: disk I/O saturation, too many concurrent compactions, or very large SSTables.

## Read/Write Latency Metrics

### Per-Table Latency

```text
# Read latency
org.apache.cassandra.metrics:type=Table,keyspace=*,scope=*,name=ReadLatency
  Count    - Total read operations
  Mean     - Average read latency (microseconds)
  99thPercentile - 99th percentile latency

# Write latency
org.apache.cassandra.metrics:type=Table,keyspace=*,scope=*,name=WriteLatency
  Count    - Total write operations
  Mean     - Average write latency (microseconds)
  99thPercentile - 99th percentile latency
```

### Coordinator Latency

```text
# Client-facing latency (includes network hops)
org.apache.cassandra.metrics:type=ClientRequest,scope=Read,name=Latency
org.apache.cassandra.metrics:type=ClientRequest,scope=Write,name=Latency
```

Coordinator latency is higher than table-level latency because it includes the time to coordinate reads/writes across replicas.

## Monitoring Multiple Nodes

```yaml
receivers:
  jmx/cassandra-1:
    jar_path: /opt/opentelemetry-java-contrib-jmx-metrics.jar
    endpoint: cassandra-1:7199
    target_system: cassandra
    resource_attributes:
      cassandra.node: "node-1"

  jmx/cassandra-2:
    jar_path: /opt/opentelemetry-java-contrib-jmx-metrics.jar
    endpoint: cassandra-2:7199
    target_system: cassandra
    resource_attributes:
      cassandra.node: "node-2"

  jmx/cassandra-3:
    jar_path: /opt/opentelemetry-java-contrib-jmx-metrics.jar
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
  condition: custom.cassandra.failure_detector.down_endpoint_count > 0
  for: 2m
  severity: critical
  message: "{{ value }} Cassandra nodes are down"

# Pending compactions growing
- alert: CassandraPendingCompactions
  condition: cassandra.compaction.tasks.pending > 50
  for: 15m
  severity: warning
  message: "{{ value }} pending compactions on {{ node }}. Compaction may be falling behind."

# High read latency
- alert: CassandraHighReadLatency
  condition: cassandra.client.request.read.latency.99p > 100000
  for: 10m
  severity: warning
  message: "Cassandra P99 read latency is {{ value_ms }}ms on {{ node }}"

# Dropped messages
- alert: CassandraDroppedMessages
  condition: rate(custom.cassandra.dropped_message.count[5m]) > 0
  severity: critical
  message: "Cassandra is dropping messages on {{ node }}. Requests are timing out."

# High SSTable count per table
- alert: CassandraHighSSTableCount
  condition: custom.cassandra.table.live_sstable_count > 50
  for: 30m
  severity: warning
  message: "Table {{ table }} has {{ value }} SSTables. Compaction may be needed."
```

## Summary

Cassandra monitoring with OpenTelemetry focuses on cluster health (node status, dropped messages), compaction performance (pending tasks, throughput, SSTable count), and read/write latency (per-table and coordinator-level). The JMX receiver's built-in Cassandra target collects a defined set of Cassandra MBeans, and you can add custom JMX mappings for additional MBeans such as failure detector, dropped messages, and per-table SSTable counts. Alert on node failures, growing pending compactions, high latency percentiles, and dropped messages to catch cluster issues before they impact application performance. Monitor each node individually since Cassandra is a peer-to-peer system where any node can be a bottleneck.
