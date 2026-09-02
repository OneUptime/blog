# Validate a Recovered Service with Synthetic Transactions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Synthetic Monitoring, Data Integrity, Testing, Observability

Description: Gate recovered traffic on user-path synthetic transactions, durable read-after-write checks, and cross-store data reconciliation.

---

A recovered service is not ready because processes are running, ports are open, or a shallow health endpoint returns 200. Recovery is complete when the critical business capability works through its real path and the recovered data forms a trustworthy history.

Use two complementary proofs:

- **synthetic transactions** test current behavior from a user-like entry point;
- **data reconciliation** checks that the recovered past is complete and internally consistent.

## Build a Readiness Ladder

Do not jump from infrastructure to traffic:

~~~text
1. Infrastructure: instances, nodes, storage, network, time
2. Control plane: schedulers, controllers, service discovery, identity
3. Data plane: databases, queues, objects, caches, indexes
4. Dependency semantics: secrets, TLS, schema, permissions, external sandboxes
5. Business reads: known records through application API
6. Business writes: unique transaction committed and read back
7. Cross-store reconciliation: all required side effects agree
8. Capacity and stability: thresholds hold during staged traffic
~~~

Each layer gates the next and emits evidence. A failed higher layer should keep external traffic disabled and, where possible, keep the service read-only.

## Define the Critical Synthetic Transaction

Choose a minimal business journey that proves the service's recovery contract. For checkout:

1. resolve the public or internal service name through a representative resolver;
2. establish TLS with normal hostname and trust;
3. authenticate as a dedicated recovery-test principal;
4. query a known pre-recovery sentinel;
5. create a uniquely tagged zero-value or sandbox order;
6. receive an application acknowledgement and business ID;
7. read the order through a separate session;
8. verify ledger and outbox records;
9. observe email, payment, and webhook effects only in approved sinks;
10. confirm the transaction remains after component restart or primary handoff where relevant.

The synthetic must use the normal ingress, authorization, application, and persistence paths. A direct database insert proves something different.

~~~json
{
  "run_id": "dr-2026-09-02-01",
  "synthetic_id": "checkout-00017",
  "submitted_at": "2026-09-02T01:21:58.129Z",
  "application_ack_at": "2026-09-02T01:21:58.442Z",
  "business_id": "order-dr-00017",
  "expected_side_effect_mode": "capture-only"
}
~~~

Use run-specific data and idempotency keys. Never use a real customer identity or a transaction that can charge a real payment method, notify a real recipient, ship goods, or make uncontrolled production changes.

## Test Reads and Writes Separately

Start with read-only checks while the recovered service remains isolated:

- old and recent sentinels are readable;
- authorization permits and denies the correct cases;
- schema and serialization match the application version;
- search or cache freshness fits degraded-mode policy;
- error responses do not expose restored secrets.

Before enabling recovery writes during a real failover, independently prove that the old writer is fenced or that the protected write path rejects its stale epoch. Then approve write enablement and run the synthetic write. Read it from a new process or connection so the request path cannot simply reuse its in-memory result. This check does not by itself prove crash durability: also verify the datastore's configured durability guarantee and, where the recovery contract requires failover survival, confirm the transaction after a restart or primary handoff. For asynchronous systems, define a bounded convergence time and poll by business ID; do not use an arbitrary sleep.

## Reconcile the Recovery Point

Capture the final acknowledged source cutoff at the planned service-interruption or fencing boundary; for an unplanned event, derive the final pre-interruption acknowledged cutoff from an independent immutable producer ledger:

~~~yaml
source_cutoff:
  commit_sequence: 9918272
  committed_at: 2026-09-02T01:00:04.010Z
failure_at: 2026-09-02T01:00:10.000Z
recovered_cutoff:
  commit_sequence: 9918261
  committed_at: 2026-09-02T00:59:27.422Z
recovery_point_age_seconds: 42.578
acknowledged_write_loss_span_seconds: 36.588
lost_write_count: 11
~~~

Recovery-point age compares the service-interruption time with the last recovered commit and is the observed recovery-point gap to compare against the RPO. The acknowledged-write loss span compares the final acknowledged source cutoff with the recovered cutoff. Sequence subtraction is valid here only because the example assumes one common gap-free sequence and suffix loss. Otherwise, reconcile explicit business IDs. Verify the highest **continuous** valid sequence; a later row does not compensate for an unexplained gap.

Use several reconciliation layers:

### Inventory

Expected schemas, tables, partitions, queues, buckets, indexes, tenants, and time ranges exist.

### Structural integrity

Vendor-supported database checks pass; schemas, constraints, indexes, roles, and extensions match.

### Aggregate controls

Compare counts, sums, minimum/maximum IDs, ledger totals, queue offsets, and canonical hashes by bounded partition. Global counts alone can hide equal and opposite errors.

### Business invariants

- every acknowledged order has the required ledger entries;
- debits and credits balance by currency;
- every outbox event refers to an existing aggregate;
- no inventory value violates its domain rule;
- every object reference resolves;
- unique business keys remain unique;
- status transitions follow allowed order.

### Cross-store continuity

Join by immutable business ID across database, queue, object, index, analytics handoff, and external sandbox. Document which derived stores may rebuild after traffic and their freshness objectives.

## Treat External Systems Explicitly

Payments, identity providers, email, SMS, webhooks, and partner APIs may contain state that backups do not. In an exercise:

- use vendor sandboxes or capturing sinks;
- reconcile request IDs and expected outcomes;
- prove production credentials and endpoints are unavailable;
- record limitations when the sandbox differs from production;
- maintain operational procedures for provider-side reconciliation after a real event.

For a real recovery, use read-only provider queries and domain-approved correction workflows. Do not replay uncertain charges blindly.

## Gate Traffic on a Signed Result

~~~yaml
recovery_acceptance:
  run_id: dr-2026-09-02-01
  release_digest: "sha256:a2121d055ea5b86a107713b4cc87b1ba2a8aaf9b26de69935c9f57cc2c9cc17b"
  configuration_digest: "sha256:89d965368fcb06db3741fe39b6832c500b7888b83545ad33327e7de587000290"
  recovery_point: backup-4812
  recovery_target: checkout-recovery-eu-west-2
  writer_epoch: 17
  service_interrupted_at: 2026-09-02T01:00:10.000Z
  business_accepted_at: 2026-09-02T01:22:14.602Z
  infrastructure: pass
  control_plane: pass
  data_integrity: pass
  old_writer_fenced: proven
  recovery_point_age_seconds: 42.578
  acknowledged_write_loss_span_seconds: 36.588
  synthetic_read: pass
  synthetic_write: pass
  cross_store_reconciliation: pass
  external_side_effects: captured-only
  capacity_headroom_percent: 42
  actual_recovery_time_seconds: 1324.602
  approved_by: [incident-commander, service-owner, data-owner]
  traffic_limit_percent: 5
~~~

Bind the result to exact release, configuration, recovery point, target, and writer epoch. If any changes, rerun the affected checks.

Shift traffic in stages and keep synthetics running. Monitor real and synthetic error rate, latency, saturation, reconciliation lag, stale-writer attempts, and side-effect sinks. A canary is not complete until observation covers delayed jobs and queues relevant to the capability.

## Avoid False Confidence

- A load-balancer health check usually proves only reachability.
- A synthetic read does not prove new writes are durable.
- A write followed by an immediate same-session read may hit a cache.
- Row counts do not prove relationships or business totals.
- Database integrity does not prove external provider state.
- A transaction against a private address does not prove DNS, TLS, and edge routing.
- One successful transaction does not prove capacity.
- A green average can hide a failing tenant, partition, region, or resolver cohort.

Google's SRE guidance distinguishes black-box monitoring, which tests externally visible behavior, from white-box internal signals. Use both: the synthetic reveals user-path failure, while internal telemetry explains it.

## Data Safety and Cleanup

Use a dedicated tenant and recognizable run ID. Keep synthetic data free of personal or payment data. Restrict who can run the transaction, rate-limit it, and audit every use. In production recovery, prefer business-valid reversible or zero-value operations; if no safe write exists, design one before the incident.

Cleanup must not erase evidence or hide recovery-point results. Remove synthetic artifacts through a supported business cancellation or retention process, not direct table deletion, unless the isolated test environment is being destroyed.

## Acceptance Criteria

The recovered service is ready when:

- infrastructure through business layers pass in order;
- synthetics use representative DNS, TLS, identity, ingress, application, and storage paths;
- pre-recovery sentinels and a new run-tagged transaction are independently readable;
- old-writer fencing is proven before recovery writes are enabled during failover;
- the new write is durable and all required side effects reconcile;
- interruption time and the recovered point measure recovery-point age for comparison with RPO, while the final acknowledged source and recovered watermarks quantify acknowledged-write loss;
- structural, aggregate, invariant, and cross-store checks pass;
- external dependencies are sandboxed in tests and reconciled in real recovery;
- acceptance is bound to exact recovery inputs and approved roles;
- staged traffic holds error, latency, capacity, and integrity thresholds;
- actual business-acceptance time meets RTO.

Readiness is not the absence of red lights. It is positive, reproducible evidence that both old data and new behavior are correct.

## Official References

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google Cloud Well-Architected Framework: Test recovery from data loss](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss)
- [OpenTelemetry: Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [AWS Well-Architected Framework: Test disaster recovery implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
