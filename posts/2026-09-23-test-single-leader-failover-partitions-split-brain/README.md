# How to Test Leader Failover, Network Partitions, and Split-Brain Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed System, High Availability, Failover, Testing

Description: Test leader failover with a durable client ledger, asymmetric partitions, stale-leader recovery, and explicit data-loss assertions.

---

A failover drill that kills a process and waits for a green dashboard checks only a small part of the system. The harder failures leave the former leader alive, reachable by some clients, and unable to communicate with its election service.

Use an isolated environment with the same replication, fencing, routing, and retry policies as production. The purpose is to test the complete write path, including uncertain client outcomes.

## Write down the guarantees

Define a successful operation as one for which the client received a durable success acknowledgment under the configured replication policy. Track three outcomes separately: success, definite rejection before execution, and unknown outcome after a timeout or broken connection.

If your configuration promises no loss of acknowledged writes, every successful operation must remain after recovery. With asynchronous replication, measure acknowledged-write loss against the agreed recovery-point objective instead of pretending every failover is lossless. PostgreSQL documents that asynchronous streaming can leave a promoted standby missing committed transactions in its [standby architecture guide](https://www.postgresql.org/docs/18/warm-standby.html).

Also define exclusivity at the destination: after a new ownership epoch is accepted, a request carrying an older epoch must be rejected. Two processes logging that they are leader is a diagnostic clue; a stale writer committing unauthorized effects is the correctness failure.

## Build an independent client ledger

Generate a unique operation ID and a deterministic payload before each request. Record attempts and responses in storage outside the cluster under test. The ledger should survive destruction of either database node.

A simple target table for PostgreSQL is:

```sql
CREATE TABLE failover_probe (
    operation_id uuid PRIMARY KEY,
    payload text NOT NULL,
    accepted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
```

Submit an insert using the same ID on retries. If the ID already exists, read and compare its payload; an existing row with different content is a conflict, not success. A unique key prevents duplicate rows in this table, but does not make a separate email, payment, or message exactly once.

After the test, compare the target's surviving rows to the client ledger. Count missing acknowledged operations, unresolved unknown outcomes, payload conflicts, and repeated external effects. Also check application invariants, such as conservation of money across a transfer, rather than only row counts.

## Exercise distinct fault paths

| Fault | What the experiment should establish |
| --- | --- |
| Abrupt leader process exit | Detection and eligible promotion recover service |
| Leader isolated from the election service | The old writer is fenced before stale effects can succeed |
| Leader isolated from replicas | Commit availability follows the selected acknowledgment policy |
| One-way packet loss | Health checks cannot mistake partial connectivity for shared agreement |
| Long process pause, then resume | The resumed former leader cannot use its stale authority |
| Slow replica storage | Failover eligibility and replication lag remain meaningful |
| Former leader reconnected | It rejoins through the supported reconciliation path |

Apply one fault at a time before combining them. Preserve a separate management path and a bounded rollback mechanism for network rules. Record the exact endpoints and directions blocked, since a symmetric partition is not equivalent to an asymmetric one.

## Observe authority, routing, and replication together

For Patroni, collect the DCS state, every node's `/patroni` response, PostgreSQL logs, proxy decisions, and the client's ledger. The [REST API reference](https://patroni.readthedocs.io/en/latest/rest_api.html) distinguishes `/primary`, which checks the primary role and leader lock, from `/leader`, which checks lock ownership without requiring the primary role.

Exercise direct connections and preexisting pooled sessions in addition to the normal proxy endpoint. A proxy switching its backend does not itself disconnect every stale session or fence the former primary.

If using Patroni watchdog fencing, test the actual configured device and mode. Its [watchdog documentation](https://patroni.readthedocs.io/en/latest/watchdog.html) describes the expiration margin and conditions for refusing leadership. A configuration file containing the word watchdog is not evidence that a stalled host will reset.

## Measure recovery and loss independently

Measure application interruption from the first failed required operation until sustained successful operations resume. Break it into detection, promotion, route propagation, reconnect, and application warmup where possible. Report both typical and worst observed values across repeated runs.

Count lost acknowledged IDs independently of downtime. Fast promotion can have poor durability, and conservative promotion can preserve durability while extending unavailability. [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html) document those policy choices and the limitations of synchronous configurations.

## Complete the recovery experiment

Reconnect the old leader while the new leader is handling writes. Keep the former writer fenced from client writes while restoring the connectivity needed to demote and reconcile it safely. PostgreSQL's [failover documentation](https://www.postgresql.org/docs/18/warm-standby-failover.html) describes rebuilding the standby relationship; divergent storage cannot be merged by simply changing the client endpoint.

Repeat the ledger comparison after redundancy is restored. Archive fault timings, effective configuration, log excerpts, and counterexamples. A drill passes when its assertions pass under the tested conditions, not when a replacement process becomes healthy.
