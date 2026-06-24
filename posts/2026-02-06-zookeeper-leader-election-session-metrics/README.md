# How to Monitor Zookeeper Leader Election Frequency, Session Count,

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, ZooKeeper, Leader Election, Session Monitoring

Description: Monitor Apache Zookeeper leader election frequency, session count, and outstanding requests using the OpenTelemetry Collector Zookeeper receiver.

Apache Zookeeper is the coordination service that many distributed systems depend on, including Kafka, HBase, and Solr. When Zookeeper is unhealthy, dependent services lose coordination, leader election fails, and configuration updates stall. The OpenTelemetry Collector's Zookeeper receiver collects metrics directly from Zookeeper's `mntr` and `ruok` four-letter commands.

## Collector Configuration

```yaml
receivers:
  zookeeper:
    endpoint: "zookeeper:2181"
    collection_interval: 15s
    metrics:
      zookeeper.latency.avg:
        enabled: true
      zookeeper.latency.max:
        enabled: true
      zookeeper.latency.min:
        enabled: true
      zookeeper.connection.active:
        enabled: true
      zookeeper.request.active:
        enabled: true
      zookeeper.znode.count:
        enabled: true
      zookeeper.watch.count:
        enabled: true
      zookeeper.data_tree.size:
        enabled: true
      zookeeper.file_descriptor.open:
        enabled: true
      zookeeper.packet.count:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: zookeeper
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [zookeeper]
      processors: [resource, batch]
      exporters: [otlp]
```

## Enabling Four-Letter Commands

The receiver uses Zookeeper's `mntr` and `ruok` four-letter commands. Enable them in `zoo.cfg`:

```text
# zoo.cfg

4lw.commands.whitelist=mntr,ruok
```

Or, when using the official Docker image, via environment variable:

```bash
ZOO_4LW_COMMANDS_WHITELIST=mntr,ruok
```

Verify they work:

```bash
echo mntr | nc zookeeper 2181
```

## Key Zookeeper Metrics

### Leader Election

Zookeeper uses a leader election algorithm to choose one node as the leader. The rest are followers. Track the leader status:

```text
server.state resource attribute: leader | follower | standalone
```

Frequent leader changes indicate instability. Monitor this through logs:

```yaml
receivers:
  filelog/zookeeper:
    include:
      - /var/log/zookeeper/zookeeper.log
    operators:
      - type: regex_parser
        regex: '(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+) \[(?P<thread>[^\]]+)\] - (?P<level>\w+)\s+\[(?P<source>[^\]]+)\] - (?P<message>.*)'
        severity:
          parse_from: attributes.level
      - type: filter
        expr: 'not (attributes.message matches "LEADING|FOLLOWING|LOOKING")'
      - type: move
        from: attributes.message
        to: body
```

Key log messages:
```text
LEADING - This node became the leader
FOLLOWING - This node is following the leader
LOOKING - This node is looking for a leader (election in progress)
```

### Session Count

```text
zookeeper.connection.active - Number of active client connections/sessions
```

Each connection represents a client session. High session counts can indicate:
- Too many Kafka brokers or consumers connecting
- Connection leaks in client applications
- Sessions not being cleaned up properly

### Active Requests

```text
zookeeper.request.active - Number of requests currently being processed
```

This is one of the most important Zookeeper metrics. A growing active request count means Zookeeper cannot process requests fast enough. Causes include:
- Slow disk I/O (Zookeeper is disk-bound for writes)
- Network saturation between ensemble members
- Too many watchers or znodes

### Request Latency

```text
zookeeper.latency.avg - Average request latency in milliseconds
zookeeper.latency.max - Maximum request latency
zookeeper.latency.min - Minimum request latency
```

Average latency should stay below 10ms for a healthy Zookeeper. Spikes above 100ms indicate problems.

### Data Tree Size

```text
zookeeper.znode.count     - Number of znodes in the tree
zookeeper.data_tree.size  - Total data size in the tree (bytes)
zookeeper.watch.count     - Number of active watches
```

A growing znode count or data tree size means clients are creating more data in Zookeeper. Excessively large data trees slow down leader elections and snapshots.

## Monitoring an Ensemble

For a 3-node Zookeeper ensemble:

```yaml
receivers:
  zookeeper/node-1:
    endpoint: "zk-1:2181"
    collection_interval: 15s

  zookeeper/node-2:
    endpoint: "zk-2:2181"
    collection_interval: 15s

  zookeeper/node-3:
    endpoint: "zk-3:2181"
    collection_interval: 15s

service:
  pipelines:
    metrics:
      receivers: [zookeeper/node-1, zookeeper/node-2, zookeeper/node-3]
      processors: [resource, batch]
      exporters: [otlp]
```

## Alert Conditions

```yaml
# No leader in the ensemble
- alert: ZookeeperNoLeader
  condition: count(server.state == "leader") == 0
  for: 1m
  severity: critical
  message: "No Zookeeper leader. Ensemble cannot process write requests."

# High active requests
- alert: ZookeeperHighActiveRequests
  condition: zookeeper.request.active > 50
  for: 5m
  severity: warning
  message: "{{ value }} active requests on {{ node }}. Zookeeper is overloaded."

# High latency
- alert: ZookeeperHighLatency
  condition: zookeeper.latency.avg > 100
  for: 5m
  severity: warning
  message: "Average latency {{ value }}ms on {{ node }}."

# Session count spike
- alert: ZookeeperSessionSpike
  condition: zookeeper.connection.active > 1000
  for: 5m
  severity: warning
  message: "{{ value }} active sessions on {{ node }}."

# Node count indicates lost quorum
- alert: ZookeeperQuorumLost
  condition: count(zookeeper.ruok == 1) < 2
  for: 1m
  severity: critical
  message: "Zookeeper quorum lost. Only {{ value }} nodes are up."
```

## Summary

Zookeeper health is critical for any system that depends on it for coordination. Monitor leader election status through logs, track active requests for processing backlog, watch session counts for connection pressure, and measure request latency for performance. The OpenTelemetry Collector's Zookeeper receiver uses four-letter commands to collect these metrics without agents. Set alerts on missing leaders, high active requests, and latency spikes to catch Zookeeper issues before they cascade to dependent services like Kafka.
