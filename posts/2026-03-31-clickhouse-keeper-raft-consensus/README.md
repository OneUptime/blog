# How to Use Raft Consensus in ClickHouse Keeper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Raft, Distributed System, Consensus

Description: Understand how ClickHouse Keeper uses the Raft consensus algorithm, how leader election works, and how to tune Raft parameters for your network environment.

ClickHouse Keeper uses Raft, a well-understood consensus algorithm, to keep all Keeper nodes in sync. Raft guarantees that every operation is durably committed to a majority of nodes before returning success to the client. Understanding how Raft works in Keeper helps you choose the right cluster size, tune timeouts, and diagnose problems like split-brain or election thrashing.

## How Raft Works in Keeper

Raft operates with three node states:

- **Leader**: The single node that accepts all write operations and replicates them to followers
- **Follower**: Receives log entries from the leader and applies them in order
- **Candidate**: A follower that has timed out waiting for a leader heartbeat and is requesting votes to become leader

All client writes go to the leader. The leader appends the operation to its log, sends it to all followers, and returns success only when a majority (quorum) of nodes have acknowledged the entry. This means:

- With 3 nodes, 2 must acknowledge (can tolerate 1 failure)
- With 5 nodes, 3 must acknowledge (can tolerate 2 failures)

Reads can be served by any connected node (followers serve reads independently of the leader), but reads from followers may be slightly behind the leader.

## Raft Configuration Parameters

```xml
<coordination_settings>
    <!-- How often the leader sends heartbeats to followers -->
    <heart_beat_interval_ms>500</heart_beat_interval_ms>

    <!-- Random election timeout range
         A follower starts an election if it does not hear from the leader
         within a random time in [lower_bound, upper_bound]
         The range avoids multiple candidates starting at the same time -->
    <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
    <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>

    <!-- How long to wait for a quorum write to complete -->
    <operation_timeout_ms>10000</operation_timeout_ms>

    <!-- How long to wait for startup sync (joining an existing cluster) -->
    <startup_timeout>30000</startup_timeout>

    <!-- How long to wait during shutdown for in-flight operations -->
    <shutdown_timeout>5000</shutdown_timeout>

    <!-- Log verbosity: trace, debug, information, warning, error -->
    <raft_logs_level>information</raft_logs_level>
</coordination_settings>
```

## Choosing the Right Cluster Size

Raft requires a strict majority to operate. This determines the valid cluster sizes:

```text
Cluster size  |  Majority needed  |  Can tolerate
1 node        |  1                |  0 failures (no HA)
2 nodes       |  2                |  0 failures (worse than 1!)
3 nodes       |  2                |  1 failure
4 nodes       |  3                |  1 failure (same as 3)
5 nodes       |  3                |  2 failures
```

Use 3 nodes for standard HA and 5 nodes for environments that need to survive 2 simultaneous failures. Never use 2 or 4 nodes - they provide no additional fault tolerance over 1 and 3.

## Monitoring Leader Elections

Frequent leader elections indicate a network or timing problem:

```bash
# Watch for election events in the log
journalctl -u clickhouse-keeper -f | grep -i "election\|leader\|candidate"

# Sample output showing a normal election:
# [Keeper] Become candidate (server id: 2)
# [Keeper] Become leader (server id: 2)
# [Keeper] Raft leader is 2

# Sample output showing election thrashing (problem):
# [Keeper] Become candidate (server id: 1)
# [Keeper] Become candidate (server id: 2)
# [Keeper] Become candidate (server id: 1)
```

Check election stats via the four-letter word interface:

```bash
echo "stat" | nc keeper1.internal 2181 | grep -E "Mode|Received|Sent|Connections"
```

## Diagnosing Split Brain

Split brain occurs when the network partitions the cluster and two groups each think they are the majority. Raft prevents this: a group can only elect a leader if it contains a strict majority of nodes. With 3 nodes, a group of 1 cannot form a quorum.

Check cluster connectivity:

```bash
# From each Keeper node, verify it can reach the others on the Raft port (default 9234)
for peer in keeper1 keeper2 keeper3; do
    nc -zv ${peer}.internal 9234 && echo "OK" || echo "UNREACHABLE"
done
```

Check which nodes the leader sees as connected:

```bash
echo "cons" | nc keeper1.internal 2181
```

## Tuning for High-Latency Networks

If your Keeper nodes are in different data centers with higher round-trip times, increase the heartbeat and election timeouts:

```xml
<coordination_settings>
    <!-- For cross-datacenter setups with 20-50ms latency -->
    <heart_beat_interval_ms>1000</heart_beat_interval_ms>
    <election_timeout_lower_bound_ms>5000</election_timeout_lower_bound_ms>
    <election_timeout_upper_bound_ms>10000</election_timeout_upper_bound_ms>
    <operation_timeout_ms>30000</operation_timeout_ms>
</coordination_settings>
```

The rule of thumb: election timeout should be at least 10x the heartbeat interval, and the heartbeat interval should be at least 5x the typical round-trip time between nodes.

## Checking Raft Log Replication

The Raft log index tells you how in-sync the followers are with the leader:

```bash
# On the leader
echo "stat" | nc keeper1.internal 2181 | grep -i "zxid\|leader"

# On all nodes - they should show similar Zxid values
for h in keeper1 keeper2 keeper3; do
    echo -n "${h}: "
    echo "stat" | nc ${h}.internal 2181 | grep -i "Zxid"
done
```

A large difference in `Zxid` between nodes means a follower is lagging. This can happen after a node restart or network hiccup.

## Auto Forwarding

When a ClickHouse client connects to a follower node and tries to write, the follower can automatically forward the write to the leader:

```xml
<coordination_settings>
    <!-- Allow followers to forward writes to the leader -->
    <auto_forwarding>true</auto_forwarding>
</coordination_settings>
```

With `auto_forwarding` enabled, write requests sent to a follower are transparently forwarded to the leader, so it does not matter which Keeper node your ClickHouse clients connect to. Without it, writes to followers return an error and the client must retry against the leader.

## Observing Commit Latency

Raft commit latency is the time from when the leader receives a write to when the quorum acknowledges it. You can measure this indirectly:

```sql
-- Check the keeper operation timing from ClickHouse's perspective
SELECT
    event,
    value
FROM system.events
WHERE event LIKE 'ZooKeeper%'
ORDER BY event;

-- Specifically look for slow operations
SELECT
    name,
    value
FROM system.metrics
WHERE name LIKE 'ZooKeeper%';
```

If operations are consistently slow, check:

1. Network latency between Keeper nodes (`ping` and `traceroute`)
2. Disk I/O on Keeper nodes (log writes are synchronous in Raft)
3. CPU load on Keeper nodes

The Raft log write is on the critical path: the leader cannot acknowledge an operation until both the leader's disk write and the followers' acknowledgments are complete. Use fast SSDs for Keeper log storage.
