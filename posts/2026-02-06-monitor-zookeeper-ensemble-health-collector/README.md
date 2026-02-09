# How to Monitor Zookeeper Ensemble Health with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Zookeeper, Distributed Systems, Ensemble, Health Monitoring, Metrics, Observability

Description: Learn how to monitor Apache Zookeeper ensemble health using the OpenTelemetry Collector to track quorum status, leader elections, and node synchronization.

---

Apache Zookeeper is one of those infrastructure components that everyone depends on but nobody thinks about until it breaks. It provides distributed coordination for systems like Apache Kafka, Hadoop, HBase, and countless custom applications that need leader election, configuration management, or distributed locking. When a Zookeeper ensemble becomes unhealthy, the effects cascade quickly. Kafka brokers lose their metadata store. Hadoop NameNodes cannot coordinate. Your distributed locks stop working. Monitoring ensemble health is not just about Zookeeper itself; it is about protecting everything that depends on it.

The OpenTelemetry Collector has a dedicated Zookeeper receiver that connects to each node in your ensemble and collects metrics using Zookeeper's built-in administrative commands. This post walks you through setting up comprehensive ensemble health monitoring.

## Understanding Zookeeper Ensemble Architecture

A Zookeeper ensemble is a cluster of an odd number of nodes (typically 3, 5, or 7) that maintain consensus using the ZAB (Zookeeper Atomic Broadcast) protocol. One node acts as the leader, and the rest are followers. The ensemble remains healthy as long as a quorum (majority) of nodes is operational.

```mermaid
graph TD
    subgraph Zookeeper Ensemble
        L[Node 1 - Leader]
        F1[Node 2 - Follower]
        F2[Node 3 - Follower]
        F3[Node 4 - Follower]
        F4[Node 5 - Follower]
    end

    L <-->|ZAB Protocol| F1
    L <-->|ZAB Protocol| F2
    L <-->|ZAB Protocol| F3
    L <-->|ZAB Protocol| F4

    C[OTel Collector] -->|mntr command| L
    C -->|mntr command| F1
    C -->|mntr command| F2
    C -->|mntr command| F3
    C -->|mntr command| F4
    C -->|Export Metrics| O[OneUptime]
```

The health of the ensemble depends on several factors: how many nodes are up, whether a leader exists, how quickly followers synchronize with the leader, and whether the nodes can handle their request load without excessive latency.

## Enabling Zookeeper Administrative Commands

Modern Zookeeper versions (3.5+) disable the four-letter administrative commands by default for security reasons. You need to explicitly enable the ones the collector needs.

Edit the `zoo.cfg` configuration file on each Zookeeper node:

```properties
# zoo.cfg - Zookeeper configuration
# Whitelist the administrative commands needed for monitoring
4lw.commands.whitelist=mntr,ruok,srvr,stat,isro

# mntr - provides comprehensive monitoring data
# ruok - basic health check (responds with "imok")
# srvr - server details including role
# stat - connection and latency statistics
# isro - checks if server is running in read-only mode
```

After updating the configuration, restart each Zookeeper node one at a time to avoid losing quorum. Verify the commands work by testing manually:

```bash
# Test the mntr command against a Zookeeper node
# This should return key-value pairs with performance data
echo mntr | nc localhost 2181

# Expected output includes lines like:
# zk_version  3.8.4
# zk_avg_latency  0
# zk_max_latency  15
# zk_min_latency  0
# zk_packets_received  1204
# zk_packets_sent  1205
# zk_num_alive_connections  3
# zk_outstanding_requests  0
# zk_server_state  leader
# zk_znode_count  142
# zk_watch_count  28
# zk_ephemerals_count  12
# zk_approximate_data_size  10847
# zk_followers  4
# zk_synced_followers  4
```

The `mntr` command is the most important one. It returns a comprehensive set of metrics that cover nearly every aspect of Zookeeper's internal state.

## Collector Configuration for Ensemble Monitoring

Here is a collector configuration that monitors a five-node Zookeeper ensemble. The key design decision is to use a single collector instance that monitors all nodes, which gives you a unified view of the entire ensemble:

```yaml
# config.yaml - OpenTelemetry Collector for Zookeeper ensemble
receivers:
  # Monitor each node in the ensemble
  zookeeper/node1:
    endpoint: "zk-node-1.internal:2181"
    collection_interval: 30s
    # Timeout for four-letter word command responses
    timeout: 10s

  zookeeper/node2:
    endpoint: "zk-node-2.internal:2181"
    collection_interval: 30s
    timeout: 10s

  zookeeper/node3:
    endpoint: "zk-node-3.internal:2181"
    collection_interval: 30s
    timeout: 10s

  zookeeper/node4:
    endpoint: "zk-node-4.internal:2181"
    collection_interval: 30s
    timeout: 10s

  zookeeper/node5:
    endpoint: "zk-node-5.internal:2181"
    collection_interval: 30s
    timeout: 10s

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Add ensemble identification
  resource:
    attributes:
      - key: zookeeper.ensemble
        value: "production-main"
        action: upsert
      - key: service.name
        value: "zookeeper-ensemble"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics:
      receivers:
        - zookeeper/node1
        - zookeeper/node2
        - zookeeper/node3
        - zookeeper/node4
        - zookeeper/node5
      processors: [resource, batch]
      exporters: [otlp]
```

Each receiver instance connects to a different Zookeeper node. The metrics from all nodes flow into a single pipeline, which means you can compare node behavior side by side in your dashboards. The resource processor adds an ensemble identifier so you can distinguish between multiple Zookeeper clusters if you run more than one.

## Critical Ensemble Health Metrics

The Zookeeper receiver collects a wide range of metrics. Here are the ones that matter most for ensemble health.

### Quorum and Role Tracking

The `zookeeper.server_state` metric tells you the role of each node: leader, follower, or observer. In a healthy ensemble, you should see exactly one leader and the rest as followers. If you see no leader, the ensemble is in an election state and cannot serve write requests. If you see multiple leaders (a split-brain scenario), something is seriously wrong with network connectivity between nodes.

### Follower Synchronization

On the leader node, two metrics are critical: `zookeeper.followers` shows the total number of followers, and `zookeeper.synced_followers` shows how many are fully synchronized. When `synced_followers` is less than `followers`, some nodes are lagging behind. If the number of synced followers drops below quorum, the ensemble is at risk of becoming unavailable.

### Latency Metrics

The receiver collects `zookeeper.latency.avg`, `zookeeper.latency.min`, and `zookeeper.latency.max`. These measure the time it takes Zookeeper to process requests. Average latency should stay under 10 milliseconds for most workloads. If average latency climbs above 50ms or max latency spikes into the hundreds of milliseconds, something is putting pressure on the ensemble, whether it is disk I/O, network issues, or excessive client load.

### Outstanding Requests

The `zookeeper.outstanding_requests` metric shows how many requests are waiting to be processed. This number should stay at or near zero. A growing queue means the server cannot keep up with incoming requests. On follower nodes, outstanding requests indicate slow synchronization with the leader.

### Connection Counts

`zookeeper.connection.active` tracks the number of client connections to each node. An imbalanced connection distribution can overload individual nodes. If one node has significantly more connections than others, check your client configuration to make sure clients are connecting to all ensemble members.

### Watch Count

`zookeeper.watch.count` tracks the number of active watches. Watches are a core Zookeeper feature that notifies clients of data changes. A very high watch count (tens of thousands) can consume significant memory and cause latency spikes when many watches fire simultaneously.

## Building Ensemble Health Dashboards

A good Zookeeper ensemble dashboard should answer three questions at a glance: Is the ensemble healthy? Which node is the leader? Are all followers in sync?

Structure your dashboard with these panels:

```text
Row 1: Ensemble Overview
- Ensemble status (healthy/degraded/down based on synced followers vs quorum)
- Leader node identifier
- Number of synced followers out of total

Row 2: Performance
- Average latency by node (line chart)
- Outstanding requests by node (line chart)
- Request throughput (packets received/sent per second)

Row 3: Resource Usage
- Active connections by node (stacked bar)
- Znode count (line chart, should be relatively stable)
- Watch count by node (line chart)
- Approximate data size (line chart)

Row 4: Ensemble Stability
- Leader election events (counter, should rarely change)
- Follower sync status timeline
- Max latency spikes (scatter plot)
```

## Alerting Strategy for Ensemble Health

The alerting rules for Zookeeper should focus on quorum safety and performance degradation.

The most important alert is on synced follower count. In a five-node ensemble, quorum requires three nodes. Alert at warning when synced followers drops to three (one failure away from losing quorum) and at critical when it drops below three:

```yaml
# Alert rule pseudo-configuration
# Quorum at risk - one more failure causes outage
- alert: ZookeeperQuorumAtRisk
  condition: zookeeper.synced_followers <= (ensemble_size / 2)
  for: 1m
  severity: warning

# Quorum lost - ensemble cannot serve writes
- alert: ZookeeperQuorumLost
  condition: zookeeper.synced_followers < (ensemble_size / 2)
  for: 30s
  severity: critical

# Latency degradation
- alert: ZookeeperHighLatency
  condition: zookeeper.latency.avg > 50
  for: 5m
  severity: warning

# Request queue building up
- alert: ZookeeperRequestBacklog
  condition: zookeeper.outstanding_requests > 10
  for: 2m
  severity: warning
```

## Handling Leader Elections

Leader elections are normal during maintenance (rolling restarts) but unexpected elections indicate instability. The Zookeeper receiver does not directly emit an "election happened" event, but you can detect elections by tracking changes in the `server_state` metric. When a node transitions from follower to leader, an election occurred.

During planned maintenance, perform rolling restarts starting with followers and restarting the leader last. This minimizes the number of elections and ensures the ensemble maintains quorum throughout the process.

## Troubleshooting Collection Issues

If the collector cannot connect to a Zookeeper node, the most common cause is a firewall blocking port 2181. The Zookeeper receiver uses a direct TCP connection, the same as the `nc` (netcat) command used for testing.

If connections succeed but metrics are empty, the four-letter commands are probably not whitelisted. Check the Zookeeper logs for "Command not in the whitelist" messages.

On Zookeeper 3.5+, you might also need to check the `admin.enableServer` setting, which controls the built-in admin server. The four-letter word commands and the admin server are separate mechanisms, but some deployments disable both, thinking they are the same thing.

## Conclusion

Monitoring a Zookeeper ensemble with the OpenTelemetry Collector gives you real-time visibility into the coordination layer that your distributed systems depend on. The Zookeeper receiver handles all the complexity of connecting to nodes and parsing the administrative command output. Focus your monitoring on quorum health, follower synchronization, and request latency. Alert aggressively on quorum degradation because losing quorum means losing availability for every system that depends on Zookeeper. With proper monitoring in place, you can catch problems early and perform maintenance confidently, knowing you will see the impact in real time.
