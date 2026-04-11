# How Sentinel Leader Election Works in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Leader Election, Raft, Consensus

Description: A deep dive into how Redis Sentinel elects a leader using Raft-inspired consensus to coordinate failover without split-brain scenarios.

---

## Why Leader Election Is Necessary

When Redis Sentinel detects that a primary is down, multiple Sentinels may want to execute the failover simultaneously. Without coordination, you could have multiple Sentinels each promoting different replicas, causing split-brain.

Leader election ensures exactly one Sentinel is responsible for executing each failover. All other Sentinels observe and accept the outcome.

## The Sentinel Epoch

Sentinel uses a concept called an **epoch** (similar to a term in Raft). The epoch is a monotonically increasing integer that identifies a specific failover attempt. Each time a new failover is initiated, the epoch increments.

Check the current epoch:

```bash
redis-cli -p 26379 SENTINEL masters
```

Look for `config-epoch` in the output:

```text
...
config-epoch
12
...
```

## How Leader Election Is Triggered

1. A Sentinel detects the primary is **SDOWN** (subjectively down) after missing heartbeats
2. The Sentinel asks other Sentinels if they also see the primary as down
3. Once enough Sentinels agree (quorum is reached), the primary is declared **ODOWN** (objectively down)
4. The Sentinel that reached ODOWN starts the leader election process

## The Voting Protocol

The leader election uses a protocol similar to Raft:

### Step 1 - Request for Votes

The Sentinel that declared ODOWN sends a `SENTINEL is-master-down-by-addr` message to all other Sentinels, requesting their vote for the current epoch:

```text
SENTINEL is-master-down-by-addr <ip> <port> <epoch> <sentinel-runid>
```

The `<sentinel-runid>` identifies the candidate asking for votes.

### Step 2 - Casting Votes

Each Sentinel can vote for at most one candidate per epoch. Voting rules:
- A Sentinel votes for the first candidate that requests its vote in the epoch
- If a Sentinel has already voted in this epoch, it rejects subsequent requests from other candidates
- Votes are persisted to disk to survive restarts within the same epoch

### Step 3 - Winning the Election

A Sentinel wins if it receives a majority of votes:

```text
majority = floor(num_sentinels / 2) + 1
```

Examples:

```text
3 Sentinels -> majority = 2
5 Sentinels -> majority = 3
7 Sentinels -> majority = 4
```

### Step 4 - Starting Failover

The winning Sentinel sends:

1. `REPLICAOF NO ONE` to the chosen replica
2. `REPLICAOF new-primary-host new-primary-port` to other replicas
3. Notifies all Sentinels of the new primary configuration

## What Happens If No One Wins

If no Sentinel receives a majority of votes (for example, network partition causes a tie), the election fails for this epoch. Sentinels wait and retry after the `failover-timeout`:

```text
sentinel failover-timeout mymaster 60000
```

The epoch increments and a new election begins.

## Epoch Prevents Split-Brain

Epochs prevent stale Sentinels from interfering with active failovers. If a partitioned Sentinel was at epoch 5 and comes back online, it sees the current epoch is already 7, knows its information is stale, and does not try to start a failover.

```text
Sentinel A: epoch=5 (partitioned, stale)
Sentinel B: epoch=7 (current)
Sentinel C: epoch=7 (current)

When A reconnects:
A sees epoch 7 > 5, skips any failover attempt, syncs to current state
```

## Observing Elections in Logs

During a failover, Sentinel logs show the election:

```text
# +vote-for-leader sentinel-runid-abc 7
# Sentinel sentinel-runid-abc epoch 7 elected as leader
# Starting a failover attempt. Epoch 7.
```

You can also watch Sentinel events:

```bash
redis-cli -p 26379 SUBSCRIBE +elected-leader
```

Or subscribe to all Sentinel events:

```bash
redis-cli -p 26379 PSUBSCRIBE '*'
```

## Pub/Sub Notifications

Sentinel publishes events on these channels during an election and failover:

```text
+odown          - Master is objectively down
+elected-leader - A Sentinel won the election
+failover-state-select-slave - Selecting a replica to promote
+promoted-slave - A replica has been promoted
+failover-end   - Failover completed
```

## Configuration for Reliable Elections

Use an odd number of Sentinels:

```text
# sentinel1.conf, sentinel2.conf, sentinel3.conf
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

With quorum=2 and 3 Sentinels, at most 1 Sentinel failure is tolerated while still maintaining election capability.

## Why 2 Sentinels Are Insufficient

With 2 Sentinels and quorum=1:
- Any single Sentinel can trigger failover (split-brain risk)
- If one is partitioned, it might promote a replica while the other still sees the old primary as fine

With quorum=2 and 2 Sentinels:
- Both must agree - if one fails, no failover is possible
- The system loses availability when any Sentinel fails

Always use at least 3 Sentinels.

## Summary

Redis Sentinel leader election uses an epoch-based voting protocol inspired by Raft: the Sentinel that detects objective downtime requests votes from peers, and the first to receive a majority of votes becomes the leader for that epoch. Epochs prevent split-brain by ensuring stale Sentinels cannot interfere with active failovers. Using 3 or more Sentinels with appropriate quorum settings is essential for reliable election outcomes and high availability.
