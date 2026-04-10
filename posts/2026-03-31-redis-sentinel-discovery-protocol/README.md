# How Redis Sentinel Discovery Protocol Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, High Availability, Protocol, Failover

Description: Learn how Redis Sentinel instances discover each other, monitor primaries and replicas, and coordinate failover using Pub/Sub and gossip.

---

Redis Sentinel provides automatic failover and service discovery for Redis without Redis Cluster. Sentinel instances form their own quorum-based group, and they use a combination of direct connections and Redis Pub/Sub to discover each other without pre-configuring every Sentinel address.

## Sentinel Bootstrap

Each Sentinel only needs to know the primary's address at startup:

```text
# sentinel.conf
sentinel monitor mymaster 10.0.0.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

Sentinels discover the rest of the topology automatically.

## Discovery via Pub/Sub

Every Sentinel subscribes to the `__sentinel__:hello` channel on every monitored primary and replica:

```bash
SUBSCRIBE __sentinel__:hello
```

Every two seconds, each Sentinel publishes a hello message to this channel on every monitored primary and replica:

```text
<sentinel-ip>,<sentinel-port>,<sentinel-runid>,<epoch>,
<master-name>,<master-ip>,<master-port>,<master-config-epoch>
```

When Sentinel A publishes and Sentinel B is subscribed to the same channel, B learns about A. This is how Sentinels discover each other - no direct Sentinel-to-Sentinel pre-configuration required.

## Primary and Replica Discovery

Sentinels discover replicas by running `INFO replication` on the primary:

```bash
# Sentinel does this periodically
INFO replication
# role:master
# slave0:ip=10.0.0.11,port=6379,state=online,offset=...
```

Sentinel then opens direct monitoring connections to each replica.

## Subjective Down vs Objective Down

**SDOWN (Subjective Down)**: one Sentinel fails to get a PING response within `down-after-milliseconds`.

**ODOWN (Objective Down)**: enough Sentinels (the quorum) report SDOWN for the primary.

```text
Sentinel A: SDOWN primary (timeout)
Sentinel A asks B and C: "Is primary down?"
B: "Yes, SDOWN"
C: "Yes, SDOWN"
Quorum reached --> ODOWN
```

## Leader Election for Failover

Before executing failover, Sentinels elect a leader using a Raft-like vote:

```text
Sentinel A sends SENTINEL is-master-down-by-addr <ip> <port> <epoch> <A-runid>
B and C respond with their vote
A receives majority -> elected leader
```

The leader then selects the best replica and runs the failover.

## Failover Steps

```text
1. Leader sends REPLICAOF NO ONE to the chosen replica
2. Replica promotes itself to primary
3. Other Sentinels learn the new primary via Pub/Sub hello messages with the updated config epoch
4. Leader reconfigures old replicas: REPLICAOF <new-primary> <port>
5. If old primary recovers, it becomes a replica of the new primary
```

## Monitoring Sentinel

```bash
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL slaves mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
redis-cli -p 26379 SENTINEL ckquorum mymaster
# OK 3 usable Sentinels. Quorum and failover authorization can be reached
```

## Summary

Redis Sentinel uses Pub/Sub on the `__sentinel__:hello` channel for peer discovery, `INFO replication` for replica discovery, and a quorum-based SDOWN-to-ODOWN escalation for failure detection. Leader election uses a Raft-like epoch-based vote before executing failover. Knowing this protocol helps you diagnose split-brain scenarios and tune `down-after-milliseconds` versus quorum size for your network reliability requirements.
