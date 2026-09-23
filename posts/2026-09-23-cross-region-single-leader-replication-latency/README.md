# How to Design Cross-Region Single-Leader Replication Without Surprise Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Multi-Region, Performance

Description: Budget cross-region request and replication latency, choose acknowledgment placement, and measure the consequences of regional failover.

---

A cross-region replica can improve recovery options and move reads closer to users. It does not move the write leader closer to every user, and synchronous acknowledgment across regions puts the wide-area network directly into the commit path.

Start with a latency budget and a failure policy. Configuration comes after deciding which regions must acknowledge a write and which data-loss scenarios the system must tolerate.

## Draw the actual request path

Record the locations of the user, application server, database leader, acknowledgment replicas, and read replicas. A local database replica is irrelevant to write latency if the application must still connect to a leader across an ocean.

For each important operation, count sequential database round trips. An ORM transaction that performs ten dependent queries across an 80-millisecond link can spend roughly 800 milliseconds on that communication alone, before execution and commit costs. Batching may help more than tuning database CPU.

Measure a baseline with a reused TLS connection and a separate cold-connection case. DNS, TCP setup, TLS negotiation, connection pooling, and authentication can dominate occasional requests even when steady-state query latency is acceptable.

## Choose what commit acknowledgment means

PostgreSQL's [synchronous_commit documentation](https://www.postgresql.org/docs/18/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT) distinguishes local durability, remote write, remote durable flush, and remote apply. Remote apply additionally waits for replay, so it can support reads on the acknowledging standby but also inherits its apply delays.

These semantics depend on eligible synchronous standbys actually being configured. Setting a value without selecting standbys does not create cross-region durability. The [synchronous replication guide](https://www.postgresql.org/docs/18/warm-standby.html#SYNCHRONOUS-REPLICATION) explains standby selection and priority versus quorum forms.

For illustration:

| Policy | Write path | Main consequence |
| --- | --- | --- |
| Local commit, asynchronous remote replica | No remote acknowledgment required | Regional loss can lose acknowledged writes |
| Remote durable acknowledgment | Includes the selected remote replica's network and flush work | WAN failures can block commits |
| Remote apply acknowledgment | Also waits for replay on the selected replica | Slow apply can increase commit latency |

The additional delay is not universally one RTT added to every transaction. It depends on when WAL is transmitted, existing backlog, storage scheduling, and how much work overlaps. Measure end-to-end commit time instead of treating a diagram as a latency calculator.

## Size acknowledgment placement deliberately

Suppose the leader and a synchronous standby are in region A, with an asynchronous disaster-recovery replica in region B. This can protect against one machine failing in A without paying a WAN acknowledgment cost. It does not establish zero acknowledged-write loss if all of A disappears before B catches up.

Conversely, requiring acknowledgment from B makes B and the path to it part of write availability. Decide whether a WAN partition should stop writes or relax the durability guarantee. Do not silently change the policy during an incident.

For Patroni, use its [replication-mode policy](https://patroni.readthedocs.io/en/latest/replication_modes.html) rather than overriding the standby selection it manages. Its strict synchronous mode changes what happens when no eligible synchronous standby is available. Document session-level settings that could weaken the intended acknowledgment contract.

Election-service placement is another decision. A quorum for coordination determines who may lead; it is separate from whether a PostgreSQL replica contains the required WAL. Verify both conditions before regional promotion.

## Give local reads an explicit consistency policy

An asynchronous local follower can be stale even if its health check passes. Classify endpoints: a product catalog may permit a bounded delay; a just-created order may require read-your-writes; an authorization change may require the current authoritative state.

Route strict reads to the leader or use a verified replication barrier on an appropriate replica. Include the potential fallback trip to the leader in the user-facing latency budget. A fast but stale response and a slow authoritative response are different service behaviors.

Avoid promising a fixed time-lag bound from a byte-lag threshold alone. WAL production varies with workload, and the [replication statistics documentation](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW) warns that reported lag times are not predictions of catch-up time.

## Benchmark failure, not only steady state

Measure per-region request latency and commit latency at multiple percentiles under realistic concurrency. Include WAL generation rate, network throughput, replica flush/apply delay, and connection-pool wait time.

Then test increased RTT, packet loss, bandwidth limitation, slow replica storage, and loss of the acknowledgment region. Record both accepted throughput and blocked or timed-out writes. A successful result must match the policy chosen earlier, including the loss of availability that stronger durability may require.

Finally perform a planned regional switchover and an unplanned failover drill. Re-measure clients whose application tier is now far from the new leader, and confirm old connections and uncertain transactions recover correctly. The architecture's latency budget must survive the topology you expect to use during an outage.
