# Why a Successful Backup Job Does Not Prove Recoverability: Designing Automated Restore Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backup, Disaster Recovery, Testing, Data Integrity

Description: Build automated restore tests that prove backups can be decrypted, restored, validated, and used within recovery objectives.

---

A green backup job proves that one workflow reported success. It does not prove that the artifact is complete, retained, decryptable, compatible with the current engine, reachable with emergency credentials, or usable by the application.

Recoverability is an end-to-end property. The only convincing test is to restore a selected recovery point into a clean target and validate its contents.

## What a Backup Success Signal Misses

A restore can fail even when every scheduled backup is green:

- the backup captured an inconsistent point across related stores;
- a retention or lifecycle rule removed an older base snapshot;
- an encryption key exists only in the failed site;
- restore credentials expired or lack a newly required permission;
- the backup format is incompatible with the tested database version;
- a manifest is intact while blocks referenced by it are unavailable;
- the database starts but contains corrupt pages, missing rows, or absent indexes;
- the restore completes after the business RTO;
- the latest usable point is older than the business RPO.

Google Cloud's Well-Architected guidance recommends judging recovery-from-data-loss tests by data integrity, RTO, and RPO. AWS likewise recommends periodic recovery of data, using the same established processes intended for production restoration.

## Use a Clean, Isolated Restore Target

Each run should create a disposable target that has no access to production write endpoints. A clean target catches dependencies that an already-running staging system can hide.

The target should have:

- the engine and extension versions declared by the recovery procedure;
- storage sized from the backup manifest plus working-space margin;
- only the restore identity and minimum validation identities;
- restricted egress, with email, payments, webhooks, and message producers blocked or replaced by sinks;
- unique DNS names and instance identifiers;
- time synchronization and centralized test logs;
- automatic expiry after evidence is exported.

Never test a destructive restore over the sole production copy. Commands such as MongoDB's mongorestore with the drop option deliberately remove target collections first; use a dedicated target and verify the connection string before execution.

## Build the Restore-Test Pipeline

### 1. Select a recovery point

Do not always select the newest artifact. Rotate cases:

- newest completed point, to measure current RPO;
- oldest point promised by retention policy;
- a point that requires a full plus incremental chain;
- a point before a schema or engine upgrade;
- a randomly sampled point, to avoid testing one privileged path.

Record the backup ID, source ID, creation and completion times, engine version, key version, checksum or manifest, and expected source watermark.

### 2. Create the target from code

Provision networking, storage, compute, database parameters, and validation identities through the same recovery automation used by the runbook. Fail if a human must supply an undocumented value.

### 3. Restore and capture every stage

Use structured events rather than one duration:

~~~json
{"event":"test_started","at":"2026-09-02T01:00:00Z"}
{"event":"artifact_selected","backup_id":"b-4821","source_watermark":981772}
{"event":"target_ready","at":"2026-09-02T01:04:18Z"}
{"event":"restore_complete","at":"2026-09-02T01:19:42Z"}
{"event":"integrity_complete","at":"2026-09-02T01:27:03Z"}
{"event":"application_acceptance_complete","at":"2026-09-02T01:29:10Z"}
~~~

Treat warnings, skipped objects, and partial failures as explicit results. Do not discard tool output after a zero exit status.

### 4. Validate in layers

Run increasingly semantic checks:

1. **Artifact checks:** expected objects exist; manifest and stored checksums verify; encryption material is accessible through the emergency path.
2. **Engine checks:** the database opens without recovery errors and reports the expected version and configuration.
3. **Physical checks:** use vendor-supported integrity tools.
4. **Logical checks:** schemas, constraints, indexes, row counts, partitions, roles, and critical objects match an expected inventory.
5. **Business invariants:** no order without its ledger entries; balances equal their component transactions; object metadata refers to existing objects.
6. **Application checks:** start a version-compatible application, read known sentinel records, create a synthetic record, read it back, and verify side effects in sinks.

For PostgreSQL base backups, pg_verifybackup checks the backup against its manifest, but PostgreSQL explicitly warns that it does not replace a test restore. After restore, amcheck can verify logical consistency of selected relations. SQL Server's RESTORE VERIFYONLY performs useful media checks but does not constitute a full restore or DBCC CHECKDB.

### 5. Calculate actual RTO and RPO

Define the test RTO stop event as “critical application transaction validated,” not “restore command exited.” To claim end-to-end actual RTO, the start event must also match the business contract, such as the interruption of service. A pipeline that begins after declaration or backup selection measures restore-and-validation duration; compare that result with its allocated stage budget rather than silently presenting it as the whole RTO.

Use two separate data-loss measurements:

~~~text
recovery point age = failure_or_isolation_time - recovered_data_point_time
acknowledged-write loss span =
  max(0, source_cutoff.commit_time - recovered_cutoff.commit_time)
~~~

Recovery-point age is the direct time-based comparison with the conventional RPO clock. The second value describes the observed lost suffix of acknowledged business writes. The source cutoff must be the newest acknowledged durable write before failure or isolation, and both cutoffs must refer to the same pre-failure history. Calculate a lost-write count from sequence subtraction only when both cutoffs use the same gap-free ordered sequence; otherwise reconcile IDs explicitly. Exclude any writes created after recovery from the recovered cutoff.

### 6. Destroy safely

Export immutable evidence, revoke the temporary identity, destroy only resources bearing the unique test-run ID, and alert if cleanup misses its deadline. Keep failed targets long enough for bounded forensic inspection, but isolate them for their entire lifetime.

## Minimal Orchestration Logic

~~~text
run_id = new_unique_id()
backup = choose_recovery_point(policy)
target = provision_isolated_target(run_id, backup.compatibility)
test_passed = false

try:
    verify_artifact(backup)
    restore(target, backup)
    verify_engine(target)
    verify_physical_integrity(target)
    verify_schema_and_counts(target, expected_inventory)
    verify_business_invariants(target)
    receipt = run_synthetic_transaction(target)
    assert receipt.is_durable
    assert measured_recovery_duration <= allocated_recovery_time_budget
    assert measured_recovery_point_age <= objective_rpo
    publish_signed_evidence(run_id)
    test_passed = true
except:
    publish_failure_evidence(run_id)
    quarantine_target_until(run_id, bounded_forensic_deadline)
    raise
finally:
    revoke_identity(run_id)
    if test_passed:
        destroy_resources_with_exact_run_id(run_id)
~~~

The cleanup selector must be an exact, immutable run ID. Avoid broad name prefixes or account-wide deletion logic. A failed target remains isolated and expires through a separately scoped cleanup action after its approved forensic window; failure must not turn into indefinite retention.

## Failure Policy and Acceptance Criteria

Page the backup owner when the pipeline finds an unusable restore point, not only when backup creation fails. Open a tracked defect when duration loses safety margin even if it still barely passes.

A backup class is proven recoverable only when:

- a clean target can restore it using documented emergency access;
- artifact, physical, logical, and business-integrity checks pass;
- a compatible application completes a synthetic write and read;
- recovery duration fits its allocated time budget and, when the test uses the contract's start event, end-to-end RTO meets the objective;
- measured recovery-point age meets the RPO objective, with acknowledged-write loss reported separately;
- retention-edge and incremental-chain cases are exercised;
- the evidence identifies backup, key, tool, engine, and application versions;
- cleanup is bounded and verified;
- failures create owned remediation work rather than being muted.

Automated restore tests convert a hopeful inventory of backup objects into repeatedly demonstrated recovery capability.

## Official References

- [AWS Well-Architected Framework: Perform periodic recovery to verify backup integrity and processes](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_backing_up_data_periodic_recovery_testing_data.html)
- [Google Cloud Well-Architected Framework: Perform testing for recovery from data loss](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss)
- [PostgreSQL: pg_verifybackup](https://www.postgresql.org/docs/current/app-pgverifybackup.html)
- [PostgreSQL: amcheck](https://www.postgresql.org/docs/current/amcheck.html)
- [Microsoft SQL Server: RESTORE VERIFYONLY](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql)
- [MongoDB Database Tools: mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/)
