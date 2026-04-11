# How Redis Cluster Handles Node Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Failure, High Availability, Failover

Description: Learn how Redis Cluster detects node failures, promotes replicas, and recovers availability automatically when primary nodes become unreachable.

---

Redis Cluster has built-in failure detection and automatic failover. When a primary node fails, its replica is promoted automatically within seconds. Understanding this process helps you configure it correctly and debug issues when it does not work as expected.

## Failure Detection: PFAIL and FAIL States

Cluster nodes monitor each other via the gossip protocol. When a node does not respond to pings:

```text
1. Detecting node marks target as PFAIL (probable failure)
   - Happens after cluster-node-timeout milliseconds

2. PFAIL is gossiped to other nodes

3. When a majority of primary nodes mark the same node as PFAIL
   -> It becomes FAIL (confirmed failure)

4. Replicas of the FAIL node start failover election
```

Check node states:

```bash
redis-cli -p 7001 CLUSTER NODES
```

```text
node-id 192.168.1.11:7002@17002 master - 0 1234567890 2 connected 5461-10922
node-id 192.168.1.12:7003@17003 master,fail 1234567890 0 0 3 disconnected
#                                       ^ fail flag set
```

## Automatic Failover Process

```text
1. Primary fails -> marked FAIL by majority of nodes
2. Replica with highest replication offset becomes candidate
3. Candidate broadcasts election request
4. Primary nodes vote (each can vote once per epoch)
5. If candidate gets majority votes -> promoted to primary
6. New primary takes over the slot range
7. Old primary (if it recovers) comes back as a replica
```

Timeline:

```text
T=0:    Primary stops responding
T=5s:   cluster-node-timeout elapses, nodes mark PFAIL
T=5-6s: FAIL consensus reached
T=6-8s: Replica election completes
T=8s:   New primary accepting writes
```

## Configuring Failure Detection Speed

```bash
# redis.conf (on all nodes)
cluster-node-timeout 15000  # 15 seconds (default)
```

Lower values mean faster failover but more false positives:

```text
cluster-node-timeout 2000   # Fast (2s), risk of false failover on slow network
cluster-node-timeout 5000   # Moderate, faster failover
cluster-node-timeout 15000  # Balanced (default)
```

## Replica Selection for Promotion

Redis promotes the replica with the smallest replication offset lag (most caught up):

```bash
# Check replica lag
redis-cli -p 7004 INFO replication | grep master_repl_offset
```

Replicas with `replica-priority 0` are never promoted:

```bash
# Prevent a specific replica from being promoted
redis-cli -p 7004 CONFIG SET replica-priority 0
```

## Slot Availability During Failover

During the window between failure detection and failover completion, the slots on the failed primary are unavailable:

```text
cluster_state:ok  -> All slots available
cluster_state:fail -> Some slots unavailable (but only briefly during failover)
```

```bash
redis-cli -p 7001 CLUSTER INFO | grep cluster_state
```

If `cluster-require-full-coverage yes` (default), writes to any slot fail when any slot is down. Change to `no` to serve available slots:

```bash
redis-cli -p 7001 CONFIG SET cluster-require-full-coverage no
```

## Handling a Failed Primary with No Replica

If a primary has no replica and fails, those slots are lost:

```bash
redis-cli -p 7001 CLUSTER INFO | grep cluster_slots_fail
# cluster_slots_fail:1280  -> 1280 slots unavailable
```

Recovery requires manually restarting the failed node or resharding those slots to another primary.

## Post-Failover Verification

```bash
# Verify new topology
redis-cli -p 7001 CLUSTER NODES | grep master

# Verify all slots covered
redis-cli -p 7001 CLUSTER INFO | grep cluster_slots_assigned
# Should be 16384
```

## Summary

Redis Cluster detects failures using a gossip-based PFAIL/FAIL system, promoting the most up-to-date replica within seconds of `cluster-node-timeout`. Configure the timeout based on your network reliability, ensure each primary has at least one replica, and monitor `cluster_state` to detect availability issues early.
