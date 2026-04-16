# How to Handle ClickHouse Keeper Leader Election

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Leader Election, Raft, Cluster, Failover

Description: Understand how ClickHouse Keeper leader election works, how to monitor it, and what to do when leader elections cause disruptions.

---

ClickHouse Keeper uses the Raft consensus algorithm for leader election. Understanding when elections happen, how long they take, and what triggers frequent re-elections helps you build a stable coordination layer.

## How Raft Leader Election Works

In a Raft cluster, each node waits a random timeout (within `election_timeout_lower_bound_ms` and `election_timeout_upper_bound_ms`) before requesting a vote. The first node to request votes from a majority wins the election and becomes leader.

The leader sends periodic heartbeats to followers. If followers don't receive a heartbeat within the election timeout, they trigger a new election.

## Check Current Leader

```bash
echo stat | nc keeper1 9181 | grep "Mode"
# Mode: leader   <- this is the current leader
# Mode: follower <- this is a follower
```

From ClickHouse SQL:

```sql
SELECT *
FROM system.zookeeper
WHERE path = '/'
LIMIT 1;
```

## Monitor Leader Elections via Keeper Metrics

```bash
echo mntr | nc keeper1 9181 | grep -E "(leader|election|epoch)"
```

Key metrics:

```text
zk_server_state         -- leader/follower/standalone
zk_synced_followers     -- only exposed by the leader; followers in sync
```

Via Prometheus (Keeper exposes async metrics with the `ClickHouseAsyncMetrics_` prefix):

```text
ClickHouseAsyncMetrics_KeeperLastLogTerm  -- Raft term; increments on each election
ClickHouseAsyncMetrics_KeeperIsLeader     -- 1 on the leader, 0 on followers
```

Alert if `KeeperLastLogTerm` increases more than once per hour - frequent elections indicate instability.

## Tune Election Timeout

For local networks (sub-1ms RTT):

```xml
<coordination_settings>
  <heart_beat_interval_ms>200</heart_beat_interval_ms>
  <election_timeout_lower_bound_ms>400</election_timeout_lower_bound_ms>
  <election_timeout_upper_bound_ms>800</election_timeout_upper_bound_ms>
</coordination_settings>
```

For cross-datacenter networks (10-50ms RTT):

```xml
<coordination_settings>
  <heart_beat_interval_ms>2000</heart_beat_interval_ms>
  <election_timeout_lower_bound_ms>10000</election_timeout_lower_bound_ms>
  <election_timeout_upper_bound_ms>20000</election_timeout_upper_bound_ms>
</coordination_settings>
```

## What Happens During an Election

1. Leader becomes unavailable (crash, network partition, GC pause)
2. Followers detect missing heartbeat after election timeout
3. One follower triggers election and requests votes
4. Majority votes for candidate - new leader elected
5. New leader resumes log replication

During the election window, Keeper does not process client requests. This pauses ClickHouse replication and distributed DDL for the duration of the election (typically 1-3 seconds for a local cluster).

## Preventing Unnecessary Elections

Frequent elections are often caused by:

- GC pauses on JVM-based monitoring tools co-located with Keeper (use standalone Keeper to avoid this)
- CPU contention on overloaded nodes
- Network congestion causing heartbeat drops

```bash
# Check for CPU throttling
top -n 1 -b | grep clickhouse-keeper

# Check for dropped packets
netstat -s | grep "failed connection attempts"
```

## After a Leader Change

ClickHouse automatically reconnects and re-discovers the new leader. You do not need to restart ClickHouse servers. Verify recovery:

```sql
SELECT is_readonly, queue_size
FROM system.replicas
WHERE table = 'events';
```

`is_readonly = 0` and `queue_size` draining to 0 confirms normal operation resumed.

## Summary

Keeper leader elections are automatic and self-healing. Tune heartbeat and election timeouts to match your network latency. Monitor `ClickHouseAsyncMetrics_KeeperLastLogTerm` in Prometheus and alert on frequent elections. Investigate CPU and network health when elections occur more often than once per hour.
