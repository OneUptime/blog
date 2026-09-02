# How to Plan a Safe Failback After the Disaster Recovery Site Becomes Primary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Failback, Disaster Recovery, Data Integrity, Runbook, High Availability

Description: Return service to the original site through reverse replication, reconciliation, planned fencing, validation, and renewed protection.

---

After failover, the disaster recovery site is no longer “the backup.” Once it accepts writes, it is the source of truth. Bringing the original site online and reversing DNS can discard or fork the transactions created during recovery.

Failback is a new migration with its own recovery objectives, approvals, and rollback boundary. It is not the final step of the failover script.

## Define Safe Entry Conditions

Do not start because the original region's status page is green. Require evidence:

- the initiating failure and contributing conditions are understood and remediated;
- the original site's compute, network, storage, identity, DNS, certificate, and control planes are stable;
- the DR site has enough capacity and support to remain primary during preparation;
- current business traffic and background jobs are healthy;
- all writes accepted after failover have an authoritative sequence or reconciliation record;
- a supported reverse-replication or reseeding method is available;
- both sites' engine, schema, application, and encryption versions are compatible;
- the original site remains fenced from production writes;
- a maintenance window, incident command, and stakeholder plan are approved;
- failback RTO, RPO, abort thresholds, and post-cutover ownership are explicit.

If the original media or data history may be corrupted, rebuild it from the current primary rather than trusting its old local data.

## Stabilize the Recovery Site First

Before moving anything:

1. close emergency configuration exceptions or record time-bounded owners;
2. take a fresh protected recovery point of the current primary;
3. verify backups and restore access in the new operating direction;
4. capture writer epoch, transaction/log position, queue offsets, and cross-store watermarks;
5. confirm monitoring, paging, and support ownership now treat DR as production;
6. freeze unrelated schema and infrastructure changes for the migration window.

Do not rush failback solely to save temporary cloud cost. Stability and data preservation have priority.

## Rebuild or Reprotect the Original Site

Treat the original site as an empty recovery target:

- provision infrastructure from reviewed code;
- apply current configuration and security policy;
- install the exact approved application and database versions;
- restore or seed from the DR primary;
- start replication in the reverse direction;
- keep applications stopped or read-only;
- validate encryption, certificates, secrets, roles, and DNS;
- continuously compare replication position and errors.

Azure Site Recovery uses the term **reprotect** for reversing replication after failover. Its guidance requires replication back toward the original location before a planned failover returns workloads. The exact procedure is product-specific; follow the deployed replication system's current documentation.

Never create unsupported bidirectional replication merely to accelerate failback. For a single-writer design, one site remains authoritative throughout.

## Reconcile Data Before Cutover

Compare more than a replication-lag dashboard:

- highest continuous transaction or event sequence;
- table, partition, tenant, and object counts;
- business totals and ledger balances;
- queue offsets and dead-letter counts;
- schema and migration versions;
- object references and checksums;
- external provider transactions;
- writes whose clients observed a timeout;
- jobs paused or replayed during failover.

~~~yaml
failback_candidate:
  source_primary: recovery-region
  source_writer_epoch: 42
  source_watermark: 9918272
  target_watermark: 9918272
  replication_lag_seconds: 0
  integrity_checks: pass
  cross_store_reconciliation: pass
  synthetic_read_only_transaction: pass
~~~

“Lag zero” means only what the replication product defines. It does not prove that pre-existing divergence or an excluded store is repaired.

## Validate the Original Site While It Is Passive

Use an isolated ingress or explicit address override:

- run TLS with the production hostname and correct SNI;
- resolve recovery-private dependencies;
- read sentinels and recent transactions;
- exercise application startup, caches, migrations, and feature flags;
- send email, payment, and webhook side effects to sinks;
- test load at the capacity required for cutover;
- confirm no write can bypass the current-primary authority.

If the design permits a read-only canary against the candidate, compare responses with the current primary while accounting for expected asynchronous data. Do not expose a writable canary.

## Perform a Planned Authority Transfer

Use gates:

~~~text
1. Announce and enter the approved change window.
2. Stop or drain new writes at the DR primary.
3. Let in-flight transactions finish within a bounded interval.
4. Record the final source watermark and writer epoch.
5. Flush and verify reverse replication to that exact watermark.
6. Reconcile critical stores and uncertain writes.
7. Fence the DR site's writers.
8. Allocate a new monotonic writer epoch to the original site.
9. Enable writes at the original site.
10. Run a durable, reconciled synthetic transaction.
11. Start and verify protection in the normal direction when the product supports doing so before traffic growth; otherwise record and approve the measured unprotected window.
12. Shift new traffic in controlled stages.
13. Drain old sessions without reopening old-site writes.
~~~

If the system cannot pause writes, use its documented zero- or low-downtime switchover protocol and prove its ordering guarantees in rehearsal. Do not invent a dual-write window.

DNS is a traffic hint, not fencing. Cached answers and established connections can continue reaching the DR site; it must reject stale-epoch writes after authority moves.

## Know the Rollback Boundary

Before the original site accepts writes, rollback can often resume DR-site service after clearing the failed attempt.

After the original site accepts writes, an automatic routing reversal is unsafe unless those new writes are durably present and valid at the DR site. At that point, “rollback” is another authority transfer:

1. stop new writes;
2. reconcile and replicate the new history;
3. fence the current writer;
4. allocate a later epoch;
5. validate;
6. move traffic.

Document this boundary prominently in approvals.

## Restore Protection After Failback

Failback is incomplete until:

- replication again protects the active site in the intended direction;
- a current recovery point exists off-site;
- failover health checks and alerts are green;
- temporary credentials, routes, and exceptions are revoked;
- the former DR primary is safely converted to its standby role;
- capacity and cost changes are reviewed;
- the runbook and dependency graph reflect the resulting architecture;
- a post-change restore or failover test is scheduled according to risk.

Azure guidance similarly calls for reprotecting resources after failover to minimize time without protection.

## Failure Cases to Rehearse

- reverse replication stalls near the maintenance window;
- source and target report different “latest” positions;
- original-site certificate or secret is stale;
- a queued job starts in both sites;
- a long transaction prevents clean drain;
- DNS sends clients to both sites;
- candidate passes health checks but fails a business write;
- cutover completes and reverse protection cannot restart;
- a failback abort occurs after the first new-site write.

## Acceptance Criteria

Failback is safe when:

- the DR site remains acknowledged as authoritative until a gated transfer;
- the original site is rebuilt or resynchronized through a supported process;
- every critical store reconciles to the final source watermark;
- old and new writers are fenced with monotonic epochs;
- passive-site business and capacity tests pass before cutover;
- write pause, replication flush, validation, and traffic stages fit the failback RTO;
- rollback logic changes explicitly after the first new-primary write;
- post-failback replication, backups, monitoring, and access restore full protection;
- synthetic transactions and data reconciliation pass during stabilization.

The correct endpoint is not “back where we started.” It is a fully protected system with one authoritative history.

## Official References

- [Microsoft Azure: Failover and failback concepts](https://learn.microsoft.com/en-us/azure/reliability/concept-failover-failback)
- [Azure Site Recovery: Fail back VMware VMs and physical servers](https://learn.microsoft.com/en-us/azure/site-recovery/vmware-azure-failback)
- [Azure Site Recovery: Execute failover and reprotect operations](https://learn.microsoft.com/en-us/azure/resiliency/recovery-orchestration-plan-execute)
- [Azure Site Recovery: About recovery plans](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [AWS Well-Architected Framework: Test disaster recovery implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
