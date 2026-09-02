# How to Design Cross-Region Failover for Stateful Services Without Violating RPO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, RPO, Database, Cloud, High Availability, Failover

Description: Design stateful cross-region recovery around acknowledged-write semantics, measured replication lag, fencing, and tested promotion gates.

---

Cross-region replication does not automatically meet a recovery point objective (RPO). The real question is: after the primary region becomes unavailable, which writes that the service already acknowledged can the recovery region prove it has?

Design from the commit contract outward. Product names such as “replica,” “global,” or “continuous” do not by themselves define data-loss behavior.

## Define the Acknowledged-Write Boundary

For every stateful system, document:

- when the client receives success;
- which replicas, logs, or storage systems have durably accepted the write at that point;
- whether cross-region replication is synchronous or asynchronous;
- the consistency and durability options actually configured;
- how current replication position and lag are measured;
- whether failover is automatic or operator initiated;
- what happens to in-flight and retried writes;
- how a promoted site rejects stale writers.

For an asynchronous design, a successful primary commit can precede delivery to the recovery region. At failure time, measure both the conventional recovery-point age and the observed acknowledged-write loss span:

~~~text
recovery point age =
  failure_or_isolation_time
  - newest continuous commit time durable in recovery

acknowledged-write loss span =
  max(0,
    newest acknowledged primary commit time before failure
    - newest continuous pre-failure commit time durable in recovery)
~~~

The first value is the direct comparison with a time-based RPO. The second quantifies the lost suffix of acknowledged writes; it can be smaller when there were no writes immediately before failure. Report lost-write count separately only when a common gap-free sequence makes subtraction valid.

Configured shipping frequency is not a bound if replication can stall without blocking primary commits. To make it an engineering objective, monitor lag, stop or degrade writes before the RPO is exhausted where the business permits, and test abrupt failure at peak write load.

## Choose a Pattern That Can Meet the Contract

### Single writer with asynchronous regional replica

This commonly offers lower normal write latency and accepts a non-zero RPO. Promotion must select a known durable recovery position. Good for workloads whose business RPO exceeds worst-case controlled lag and whose lost writes can be detected or reconciled.

### Single writer with synchronous remote acknowledgement

The primary does not acknowledge until the required remote durability condition is met. This can support a tighter RPO, but cross-region round-trip latency and remote health enter the write path. Exact guarantees depend on the database and configuration.

Decide what happens when the remote region is slow: block writes, reduce the acknowledgement set, or fail requests. Silently falling back to local-only acknowledgement changes the effective RPO.

### Quorum or consensus across failure domains

A vendor-supported consensus group can keep a single ordered history while quorum remains. Region placement, voting topology, latency, and failure tolerance must follow that product's documentation. Simply deploying an even number of nodes across two regions does not create a safe majority during partition.

### Multi-writer across regions

Use only when the product and application define conflict, uniqueness, ordering, and convergence semantics that satisfy business invariants. “Eventually consistent” does not explain how two withdrawals, inventory decrements, or unique usernames reconcile.

AWS, Azure, and Google Cloud all describe cost, latency, complexity, RTO, and RPO trade-offs across standby and multi-region patterns. Their architecture guides are design inputs; only the selected managed service's current documentation defines its replication behavior.

## Protect Against Corruption as Well as Outage

Replication can copy deletion, encryption, or logical corruption quickly. Maintain independent, versioned backups or point-in-time recovery in a separate administrative boundary. Protect keys and catalogs needed to select and decrypt a point.

Define two recovery paths:

- **availability failure:** promote a sufficiently current replica;
- **logical corruption:** choose a known-good historical point and reconcile later writes.

The fastest replica may be the wrong source for corruption recovery.

## Make Promotion an Evidence-Backed Gate

Before enabling writes in the recovery region:

~~~yaml
promotion_gate:
  source_failure_scope: confirmed
  old_writer_fenced: proven
  candidate:
    identity: db-region-b-2
    role: replica
    health: pass
    durable_position: "lsn-or-vendor-position"
    recovery_point_age_seconds: 34
  objective_rpo_seconds: 60
  integrity: pass
  application_read_test: pass
  approvals: [incident-commander, data-owner]
~~~

Use the product's authoritative replication position rather than a dashboard timestamp alone. If no candidate meets RPO, surface that fact to the incident commander. Do not manipulate the metric or promote blindly.

## Fence the Old Writer

Network reachability failure does not prove the old primary stopped. Use mechanisms supported by the system:

- quorum-based demotion;
- storage or compute fencing;
- revocation of write credentials;
- a monotonically increasing writer epoch checked by the storage path;
- routing and listener removal as additional containment.

The new site must not accept writes while an old site can still mutate shared or later-mergeable state. DNS alone is not fencing; existing connections and clients with cached addresses can continue.

## Recover the Whole Stateful Transaction

Inventory databases, durable queues, object stores, change streams, caches, indexes, and external providers. Establish a common business watermark:

~~~text
order 9821 committed
ledger event 9821 committed
outbox event 9821 committed
object receipt 9821 stored
~~~

If the database is current but the durable queue is older, the critical capability may still violate RPO. Use transactional outbox, idempotent replay, or a product-supported consistent recovery group where appropriate. Validate the actual design rather than assuming cross-service atomicity.

## Capacity and Control-Plane Planning

A data replica is not a recovery environment. Pre-check:

- compute and storage quota;
- network address space and private connectivity;
- encryption keys and secret access;
- database parameter, extension, and engine compatibility;
- load balancer, DNS, certificate, and service identity;
- write throughput, connection count, cache warm-up, and background jobs;
- ability to operate when a cloud control plane is impaired.

Reserve capacity where the business requires stronger assurance. Google Cloud's disaster-recovery building-block guidance notes that without reservations, on-demand capacity might be unavailable when needed.

## Test RPO Under Adverse Conditions

In an isolated or safely controlled exercise:

1. generate uniquely sequenced writes through the normal application path at peak-like load;
2. acknowledge them exactly as production does;
3. inject abrupt primary-region isolation at an unknown sequence;
4. record the source cutoff from an independent client ledger;
5. promote only through the runbook;
6. find the highest continuous valid sequence in recovery;
7. calculate recovery-point age, acknowledged-write loss span, and a valid lost-write count;
8. reconcile duplicates, gaps, queues, objects, and external side effects;
9. run a new write and verify it cannot be accepted by the old writer;
10. test reverse replication and failback separately.

Include stalled replication, delayed metrics, expired credentials, quota shortage, and a primary that later returns.

## Acceptance Criteria

The design supports its RPO when:

- acknowledged-write durability and degraded replication behavior are explicit;
- topology and consistency settings match current vendor documentation;
- monitored lag has an actionable threshold before RPO exhaustion;
- independent point-in-time recovery protects against replicated corruption;
- promotion selects and records an authoritative durable position;
- old-writer fencing is proven before new writes;
- every state store maps to a compatible business watermark;
- recovery capacity and dependencies are available;
- abrupt peak-load exercises repeatedly meet RPO and integrity invariants;
- failback preserves all writes made while the recovery region was primary.

RPO is not a label on replication. It is a demonstrated bound on acknowledged business state.

## Official References

- [AWS Well-Architected Framework: Use defined recovery strategies](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html)
- [Microsoft Azure Well-Architected Framework: Disaster recovery architecture strategies](https://learn.microsoft.com/en-us/azure/well-architected/reliability/disaster-recovery)
- [Google Cloud: Disaster recovery planning guide](https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide)
- [Google Cloud: Disaster recovery building blocks](https://docs.cloud.google.com/architecture/dr-scenarios-building-blocks)
- [Microsoft Azure: Redundancy, replication, and backup](https://learn.microsoft.com/en-us/azure/reliability/concept-redundancy-replication-backup)
