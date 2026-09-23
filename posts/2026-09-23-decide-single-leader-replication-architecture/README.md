# How to Decide When Single-Leader Replication Is the Right Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Architecture, Database, Replication, High Availability, PostgreSQL

Description: Evaluate single-leader replication against write capacity, read consistency, failure recovery, and regional latency before choosing a topology.

Single-leader replication gives one database server authority to accept writes for a replicated dataset. Followers reproduce its changes and may serve reads. The design is useful when one writer can handle the workload and the application benefits from a clear place to enforce transactions and constraints.

The decision is less about the number of servers than the contract during failure. Which successful writes must survive? Which reads may be old? How long may writes stop while authority moves? Answer those questions before drawing a three-node diagram.

## Define the scope of the leader

A leader might own the entire database, one tenant group, or one shard. Multiple shards can each have a leader without making the same records writable everywhere. Define that boundary explicitly:

```text
Dataset: orders and inventory for one business unit
Write authority: one PostgreSQL primary
Local followers: failover and selected reads
Remote follower: disaster recovery
Cross-dataset transactions: not assumed
```

PostgreSQL's [high-availability overview](https://www.postgresql.org/docs/current/high-availability.html) distinguishes writable primaries from standby servers, including hot standbys that accept read-only queries. Replication is a way to copy and recover state; it does not automatically distribute write execution across all copies.

If your diagram has three replicas but every order still modifies the same inventory row, additional replicas do not remove that writer's lock contention.

## Measure the workload that stays on the writer

Separate the workload into writes, reads that must use current authoritative state, and reads that tolerate delayed state. A rough planning example is:

| Request class | Peak requests per second | Initial route |
| --- | ---: | --- |
| Checkout mutations | 800 | Primary |
| Checkout confirmation reads | 1,200 | Primary |
| Product browsing | 12,000 | Followers or cache |
| Reporting | 20 long queries | Dedicated reporting path |

These numbers are an example, not a capacity claim. Benchmark transaction complexity, indexes, row contention, storage latency, and connection concurrency. Test the combined 2,000-request writer workload with replication enabled, then reserve headroom for bursts and failover.

Measure the promoted follower under the same workload. A cheaper replica that can replay ordinary traffic might be unable to run the application after promotion. Also account for reads moving back to the writer when followers are unavailable: graceful fallback can become an overload event.

## Make read consistency a product decision

Classify endpoints instead of sending every `SELECT` to a replica. Inventory checks inside checkout, permission changes, and immediate confirmation pages often need a stronger contract than a catalog page.

Use primary reads for the simplest dependent workflows. If read capacity requires replicas, implement a documented consistency mechanism, such as a replay-position fence, with a deadline and fallback. A low average lag measurement cannot prove that one particular write is visible.

Long reporting queries deserve separate consideration. PostgreSQL may delay replay or cancel a standby query when it conflicts with incoming WAL. Its [hot-standby documentation](https://www.postgresql.org/docs/current/hot-standby.html#HOT-STANDBY-CONFLICT) explains this interaction. A replica optimized for uninterrupted analytics can be a poor candidate for rapid promotion.

## Choose the failure contract before the replica count

Write down both the recovery point objective, the acceptable loss of acknowledged data, and the recovery time objective, the acceptable interruption.

For example:

```text
Local host failure: preserve acknowledged orders
Loss of synchronous follower: temporarily block order commits
Regional disaster: recover within the agreed remote-copy RPO
Uncertain client outcome: reconcile using the original operation ID
Former primary returns: keep fenced until safely resynchronized
```

This is a proposed contract to discuss with application owners. If the business instead requires writes to continue independently in two disconnected regions, one global write authority cannot satisfy that requirement. Consider partitioning ownership, changing the business workflow, or evaluating a database designed for the required distributed transaction behavior.

A remote asynchronous copy does not inherit the durability contract of a local synchronous copy. Place copies in failure domains that match the incidents you claim to survive.

## Include election, routing, and recovery in the design

Replication alone is not a complete availability service. PostgreSQL's [failover documentation](https://www.postgresql.org/docs/current/warm-standby-failover.html) discusses the need to prevent the old primary from returning as another writable server and leaves failure detection to external software.

Your design therefore needs an identified owner for promotion decisions, a way to exclude the old writer, role-aware connection routing, and a supported rejoin procedure. Check existing connections as well as new ones. A DNS change cannot move a transaction already running on the former primary.

Budget operational effort for replica rebuilds, WAL retention, backups, schema changes, and capacity alarms. Prefer a supported managed service or established HA controller when the team cannot continuously operate these mechanisms.

## Record an explicit acceptance decision

Single-leader replication is a good candidate when the measured writer workload has headroom, sensitive reads have a clear route, and the application tolerates the selected failure behavior. Reconsider it when global write latency, sustained writer contention, or independent regional operation is the dominant requirement.

Before accepting the architecture, run a peak-load exercise, remove a follower, fail the writer, and reconnect clients. Record acknowledged operation IDs outside the failed database and reconcile them after recovery. Verify the actual outage and loss against the contract, rather than treating a successful promotion as the entire test.

A useful architecture decision includes the measurements, the consistency rules, the allowed failure modes, and the trigger for revisiting the design. That turns single-leader replication from a default diagram into a choice the team can defend and operate.
