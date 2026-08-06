# Can You Safely Roll Back a Database Change?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database Migration, Schema Migration, Rollback, Deployment Safety, Production Readiness

Description: Test schema compatibility, data semantics, code reverts, and forward fixes before a database-backed release reaches production.

---

Rolling an application image back is easy only when the database still satisfies the old application's assumptions. Once a release changes stored data, a code rollback can restore the old binary while leaving it connected to a schema and dataset it cannot understand.

A readiness review should therefore ask a narrower, testable question: can every version that may run during the rollout read and write the database state it may encounter? The answer requires more than a rollback script.

## Define What Rollback Means

Separate four operations that are often called rollback:

1. **Traffic rollback** sends requests back to the previous application version.
2. **Code rollback** redeploys a known application artifact.
3. **Schema rollback** reverses a database definition change.
4. **Data restoration** replaces current data with an earlier copy or point in time.

These operations are not equivalent. Restoring data can discard legitimate writes made after the restore point. Reversing a schema does not necessarily reverse a data transformation. A traffic rollback still fails if the old code cannot read rows written by the new code.

Record which operation is permitted for each release and who can authorize data loss. For most online releases, the safest first response is a traffic or code rollback across a backward-compatible schema, not immediate destructive schema reversal.

## Classify Every Database Change

Create an inventory before choosing a recovery plan:

| Change | Typical compatibility risk | Safer release shape |
| --- | --- | --- |
| Add a nullable column | Old readers may break if they map `SELECT *` positionally | Add first, use explicit column lists |
| Add a required column | Old writers do not supply a value | Add nullable or with a safe default, backfill, enforce later |
| Rename a column | Old and new binaries use different names | Add the replacement, support both, migrate, remove later |
| Change a type | Readers, indexes, locks, and conversion semantics may change | Introduce a new column and convert incrementally |
| Drop a column or table | Old code stops working immediately | Prove no old readers or writers remain before deletion |
| Rewrite values | Old code may not understand the new representation | Dual-read or version the representation during coexistence |
| Add an index | Build behavior and locking vary by engine and version | Use the engine's documented online method and test it at scale |

This table is a planning heuristic, not a database guarantee. Verify locking, transaction, replication, and DDL behavior in the exact engine and version you run.

## Use Expand, Migrate, and Contract

The core technique is to let old and new code coexist.

### 1. Expand

Make an additive schema change that does not invalidate the current application. For example, a PostgreSQL-oriented migration might begin with:

```sql
ALTER TABLE customer
  ADD COLUMN display_name_v2 text;
```

Do not add an immediate `NOT NULL` constraint unless every existing row and every old writer can satisfy it. Deploy this schema while only the old code serves traffic, then run its normal read and write tests.

### 2. Deploy compatible code

The new code should tolerate both representations. A transitional write path may populate both columns:

```sql
UPDATE customer
SET display_name = $1,
    display_name_v2 = $1
WHERE customer_id = $2;
```

Dual writes create their own consistency risks. Prefer one transaction when both fields are in the same transactional database, monitor mismatches, and make retry behavior idempotent. If dual writes cross systems, document the consistency model and repair process instead of implying atomicity.

For reads, define precedence explicitly:

```sql
SELECT customer_id,
       COALESCE(display_name_v2, display_name) AS display_name
FROM customer
WHERE customer_id = $1;
```

### 3. Migrate existing data

Backfill in bounded batches. Track rows scanned, rows changed, error count, replication lag, lock wait, database CPU, and application latency. A resumable job needs a stable checkpoint and must be safe to run again.

```sql
UPDATE customer
SET display_name_v2 = display_name
WHERE customer_id > $1
  AND customer_id <= $2
  AND display_name_v2 IS NULL;
```

Do not infer completeness from job exit status. Query for missing or divergent values and reconcile them.

### 4. Switch reads, then stop legacy writes

Use a controlled application release or feature flag to switch the preferred read path. Observe it before stopping writes to the legacy representation. This ordering preserves the option to return traffic to old code.

### 5. Contract later

Remove the old column, trigger, or compatibility code only after:

- all old application versions are absent from production and rollback inventory;
- queued work and long-running jobs using the old format have drained;
- replicas, analytics jobs, change data capture consumers, and ad hoc tools are checked;
- the agreed rollback window has expired;
- a fresh backup and tested recovery path exist.

Contract is a separate release. Treat it as destructive and independently review it.

## Test the Version-Schema Matrix

Run the combinations that a rolling deployment and recovery can actually create:

| Test | Binary | Schema and data | Required result |
| --- | --- | --- | --- |
| Baseline | old | old | Existing tests pass |
| Expansion safety | old | expanded | Old reads and writes pass |
| New release | new | expanded, before backfill | Missing new values are handled |
| Mixed fleet | old and new | expanded | Concurrent reads and writes remain consistent |
| Post-write rollback | old | rows written by new | Old code remains correct |
| Forward fix | fixed new | partially migrated | Repair can resume without duplication |
| Contract | new only | contracted | No legacy dependency remains |

Use production-like schema size and workload. A migration that is logically correct on a tiny fixture can still hold locks too long, saturate replication, or exceed a maintenance window at production scale.

Include asynchronous paths: queue consumers, scheduled jobs, exports, replicas, and disaster recovery environments may run older code longer than the request-serving fleet.

## Exercise Both Recovery Directions

Run an automated rehearsal in a disposable environment:

```text
restore production-shaped snapshot
deploy old application
apply expansion
deploy a mixed old/new fleet
write through both versions
run a partial backfill
route all traffic to old version
verify user journeys and invariants
redeploy the fixed new version
resume the backfill
verify invariants again
```

Keep two prepared paths:

- **revert** when the old binary is compatible and faster to restore;
- **forward fix** when new writes or an irreversible migration make the old behavior unsafe.

The forward fix must be a built, reviewable artifact, not an instruction to edit production manually. If it cannot be prepared exactly, prepare the deployment mechanism, access, test query, and ownership.

## Define Evidence and Stop Conditions

A readiness gate should require artifacts, not assurances:

- migration and application revisions;
- compatibility test results for every matrix row;
- measured migration rate and estimated duration;
- lock, latency, replication lag, and error limits;
- data invariant queries and expected results;
- rollback and forward-fix commands with named operators;
- point of no return, if one exists;
- backup identifier and recent restore-drill evidence.

Example team policy:

```yaml
database_change_gate:
  expansion_tested_with_old_binary: true
  mixed_version_tested: true
  old_binary_tested_after_new_writes: true
  backfill_resumable: true
  invariant_query_attached: true
  rollback_owner: database-oncall
  rollback_window: "24h"
  destructive_contract_release: "separate"
```

The values and the 24-hour window above are example policy, not requirements from AWS, Google Cloud, or any database engine. Choose a window long enough to observe representative workload and short enough that compatibility code has an accountable retirement date.

## Official Documentation

- [AWS DevOps Guidance: Ensure backwards compatibility for data store and schema changes](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/dl.ads.5-ensure-backwards-compatibility-for-data-store-and-schema-changes.html) documents coexistence testing across old and new software and a rollback deployment.
- [AWS Blue/Green Deployments: Managing data synchronization and schema changes](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/best-practices-for-managing-data-synchronization-and-schema-changes.html) describes decoupling schema and code changes, additive changes before code, and deletive changes after compatibility is no longer needed.
- [AWS Well-Architected: Plan for unsuccessful changes](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_mit_deploy_risks_plan_for_unsucessful_changes.html) calls for documented rollback criteria, known-good code, visible change data, and monitoring to decide whether a deployment failed.
- [Google Cloud: Database migration concepts and principles](https://docs.cloud.google.com/architecture/database-migration-concepts-principles-part-1) explains migration consistency, fallback architecture, and completeness and consistency verification.

## Conclusion

A rollback is safe only when the old application has been tested against the schema and data that will exist at rollback time. Keep database changes additive through the observation window, validate a mixed-version fleet, test old code after new writes, and delay destructive cleanup. When reversal is unsafe, a rehearsed forward fix is the recovery plan.
