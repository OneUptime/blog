# Keep Schema Migrations Out of Databricks Bundle Deploys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Declarative Automation Bundles, Schema Migration, Delta Lake, CI/CD, Lakeflow Jobs, Data Reliability

Description: Deploy migration machinery with a Databricks bundle, but execute each schema change through an explicit, serialized release gate.

---

A Databricks bundle deployment should publish resource definitions and artifacts. It should not implicitly execute every schema migration whenever `databricks bundle deploy` runs.

Databricks documents bundle validation, deployment, and workflow execution as separate lifecycle stages. Preserve that separation:

```text
validate -> deploy resource definitions -> approve migration -> run migration job -> verify -> release consumers
```

The bundle can own the migration job and its code. The release pipeline decides whether and when to run it. That distinction prevents a harmless artifact redeploy, retry, rollback, or second service deployment from becoming an unplanned production DDL event.

## Why Deploy-Time Migration Is the Wrong Coupling

`bundle deploy` can run repeatedly for reasons unrelated to data shape:

- a job schedule or notification changed;
- a wheel was rebuilt without a schema change;
- CI retried after losing its connection;
- a resource definition drifted;
- an operator redeployed the same release;
- a rollback restored older job code;
- a shared bundle was deployed by another service.

If the deploy hook also runs `ALTER TABLE`, correctness depends on deploy frequency and ordering. That is a poor migration protocol.

A code rollback makes the problem clearer. Reverting job code does not necessarily mean the schema can or should be reversed. Dropped columns, rewritten types, and backfills can be destructive or irreversible. Application release state and database migration state must be recorded independently even when one release coordinates both.

## The Bundle Deployment Lock Does Not Serialize DDL

Bundles use deployment state and a deployment lock to keep concurrent bundle deployments from interfering with the same bundle identity. `--force-lock` disables that protection and is intended only for a stale lock left by an interrupted deployment.

That lock protects bundle deployment operations. It is not a global lock on a Unity Catalog schema or Delta table. It does not prevent:

- a separately deployed bundle from changing the same table;
- a running migration job from overlapping another job;
- ad hoc SQL from an administrator;
- writers or streams from committing during DDL;
- a second deployment identity from targeting related resources.

`--fail-on-active-runs` can stop deployment when jobs or pipelines in that deployment are active. It still is not a table migration coordinator.

Never use `--force-lock` as a routine CI flag. It weakens the only deployment concurrency protection without adding any data-layer serialization.

## Deploy a Migration Job, Not an Automatic Side Effect

Define a dedicated job in the bundle. Its single purpose is to apply an explicitly selected migration set under a stable run identity. A SQL-file task can use an existing SQL warehouse:

```yaml
resources:
  jobs:
    schema_migrations:
      name: ${bundle.target}-schema-migrations
      max_concurrent_runs: 1
      tasks:
        - task_key: apply_migrations
          sql_task:
            file:
              path: ${workspace.file_path}/migrations/apply.sql
              source: WORKSPACE
            warehouse_id: ${var.migration_warehouse_id}
```

Depending on the migration framework, a Python wheel or notebook task can be a better runner because it can discover ordered files, compute checksums, enforce preconditions, and write a ledger. The important property is that deployment creates or updates this job but does not run it.

The release pipeline invokes it explicitly:

```bash
databricks bundle validate -t prod
databricks bundle deploy -t prod --fail-on-active-runs

databricks bundle run -t prod schema_migrations
```

Use a required CI environment, change ticket, signed release manifest, or equivalent control around the second command. A migration-free release can skip the migration stage entirely.

## Give Every Migration an Immutable Identity

Store migrations as ordered, immutable artifacts:

```text
migrations/
  V20260805_001__add_order_channel.sql
  V20260812_001__backfill_order_channel.sql
  V20260820_001__enforce_order_channel.sql
```

Each applied migration should have a ledger entry containing at least:

- migration ID;
- content checksum;
- applied timestamp;
- run identity;
- application release or Git SHA;
- success status and verification evidence.

A minimal Delta ledger shape is:

```sql
CREATE TABLE IF NOT EXISTS platform_ops.release.schema_migrations (
  migration_id STRING NOT NULL,
  checksum STRING NOT NULL,
  applied_at TIMESTAMP NOT NULL,
  applied_by STRING NOT NULL,
  release_sha STRING NOT NULL
) USING DELTA;
```

Do not assume the `NOT NULL` clauses make `migration_id` unique. The runner and release coordinator must reject duplicates and serialize execution. Keep applied migration files immutable; if a checksum differs for an existing ID, fail rather than silently rewriting history.

The ledger is not a distributed transaction across arbitrary DDL statements. A run can fail after the table changed but before its ledger record committed. Every migration therefore needs:

- a precondition describing the expected starting state;
- idempotent or explicitly resumable statements where possible;
- a postcondition proving the desired final state;
- a documented manual repair path for partial application.

Blindly retrying an unknown DDL state can make the incident worse.

## Serialize at the Right Scope

`max_concurrent_runs: 1` prevents overlapping runs of that one job. It does not coordinate another migration job in another bundle. Use one canonical migration job per governed schema or another external release lock shared by every writer to that migration domain.

The lock scope should match the blast radius:

```text
one table touched -> at least table-level coordination
several related tables -> schema or data-product release coordination
shared contract tables -> cross-service migration authority
```

Also stop or drain jobs that write the affected tables. Databricks documents that schema updates conflict with concurrent Delta writes, and metadata changes cause streams reading the table to terminate. A successful DDL statement followed by a wave of failed writers is not a successful release.

Record the table versions and active workloads before execution:

```sql
DESCRIBE HISTORY prod.sales.orders;
DESCRIBE DETAIL prod.sales.orders;
```

Use supported job and streaming monitoring to prove writers are quiescent. Resume and verify them after the migration.

## Use Expand and Contract for Compatible Releases

Avoid changing producer and consumer contracts in one irreversible step. Split the migration into phases.

### Expand

Add a compatible element first:

```sql
ALTER TABLE prod.sales.orders
ADD COLUMNS (order_channel STRING COMMENT 'Originating sales channel');
```

Then deploy writers that populate both the old and new representations where needed. Restart streams terminated by the metadata change and verify that they resume from their existing checkpoints.

### Migrate Data and Readers

Backfill the new representation in a controlled job, validate it, and move readers. Backfill is a data migration with its own runtime, cost, retry, and reconciliation concerns; do not hide it in a fast deployment hook.

### Contract

Only after every producer and consumer has moved should a later release drop or constrain the old element. Contract steps often need a longer rollback plan and stronger approval because they remove compatibility.

This sequence also handles non-null transitions safely: add nullable, populate all rows, update writers, verify, then enforce the final constraint if the chosen table feature supports it.

## Separate Deploy and Run Identities

Declarative Automation Bundles support a `run_as` identity for deployed workflows. Databricks recommends service principals for production workflows and supports separating the identity that deploys a bundle from the identity that runs its jobs.

Use that separation deliberately:

- The deploy identity can update the job definition and workspace artifacts.
- The migration run identity has only the catalog, schema, table, volume, and warehouse permissions needed for approved migrations.
- Ordinary application jobs do not receive schema-administration privileges.

A target-level pattern is:

```yaml
targets:
  prod:
    mode: production
    run_as:
      service_principal_name: ${var.migration_service_principal}
```

If the same bundle contains ordinary jobs, a bundle-wide `run_as` might grant the migration principal to more workflows than intended. Consider a separate migration bundle or resource ownership pattern when least privilege requires a distinct identity.

The migration ledger should record `current_user()` or the equivalent authenticated principal, not the human who clicked approve.

## Make the Release Stage Fail Closed

The migration runner should reject:

- an unknown environment or target;
- a migration ID already applied with a different checksum;
- gaps or unexpected ordering in the approved migration set;
- an unavailable migration lock;
- failed preconditions;
- active incompatible writers;
- unexpected source table versions;
- failed postconditions or reconciliation queries.

Do not infer success from `bundle deploy`. Deployment proves that resource definitions were accepted. It does not prove the migration job ran or that the new schema is usable.

After the explicit run, capture:

- terminal job and task states;
- migration ledger rows;
- `DESCRIBE HISTORY` entries and table versions;
- schema and constraint checks;
- row counts and business invariants for backfills;
- restarted stream progress and checkpoint recovery;
- application smoke tests as real service principals.

Release consumer code only when these checks pass, or use a deliberately staged expand step that remains compatible with the old consumers.

## Handle Failure and Rollback as Data Operations

Classify each migration before approval:

| Class | Example | Recovery pattern |
| --- | --- | --- |
| Additive metadata | Add nullable column | Leave in place or follow with later cleanup |
| Reversible metadata | Rename through a compatibility layer | Execute reviewed inverse if safe |
| Data backfill | Populate new key | Resume idempotently from recorded batches |
| Destructive contract | Drop column or table | Restore from clone, backup, or retained history if still available |
| Long rewrite | Change representation | Shadow table, reconcile, and swap readers |

Do not automatically execute a down migration during an application rollback. First determine whether new writers have already committed data that old code cannot understand. Often the safest rollback is to restore old application code while leaving an additive schema change in place.

For destructive steps, prove the recovery source and retention window before execution. Delta time travel is not a backup after required files have been vacuumed.

## A Practical Release Contract

Require each migration pull request to declare:

1. immutable ID and checksum;
2. affected catalogs, schemas, tables, views, and volumes;
3. expected current table versions or schema preconditions;
4. writer and stream coordination plan;
5. estimated runtime and warehouse or compute requirements;
6. postcondition and data reconciliation queries;
7. expand, migrate, and contract phase;
8. rollback or forward-fix procedure;
9. approver and execution window.

CI can validate file naming, ordering, checksum immutability, SQL parsing where supported, and bundle configuration on every change. Production execution remains a distinct, observable stage.

## Official Documentation

- [Develop Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/work-tasks)
- [`bundle` command group](https://docs.databricks.com/aws/en/dev-tools/cli/bundle-commands)
- [Add job task types to bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/job-task-types)
- [Specify a bundle workflow run identity](https://docs.databricks.com/aws/en/dev-tools/bundles/run-as)
- [Update Delta table schemas](https://docs.databricks.com/aws/en/tables/update-schema)
- [Configure Lakeflow Job task run conditions](https://docs.databricks.com/aws/en/jobs/run-if)
- [Declarative Automation Bundles job parameters](https://docs.databricks.com/aws/en/dev-tools/bundles/job-parameters)

## Conclusion

Let a Databricks bundle deploy the migration job and immutable migration artifacts, but make production schema execution an explicit release action. A serialized runner, checksum ledger, stable run identity, preconditions, postconditions, and expand-contract phases provide the controls that a deployment hook cannot. Bundle deployment success and schema migration success are different facts, and the release pipeline should prove both separately.
