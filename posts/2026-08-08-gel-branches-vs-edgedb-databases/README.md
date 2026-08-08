# Gel Branches vs Legacy EdgeDB Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Branches, Databases, CI, Development Workflow

Description: Choose empty, schema-only, or data-copy Gel branches for development and CI while avoiding legacy database terminology traps.

---

EdgeDB 5 introduced branches and deprecated the older database terminology. Current Gel branches map directly to PostgreSQL databases, but the Gel CLI adds schema-copy, data-copy, switching, rebase, and merge workflows intended to pair database state with source-control branches.

The important decision is not whether to call an isolated namespace a branch or database. It is what the new branch should inherit: nothing, schema only, or schema plus data.

## Version Boundary and Defaults

Before EdgeDB 5, instances exposed databases and used commands such as `create database`. EdgeDB 5 and current Gel use branches. The old DDL remains documented as deprecated, but it does not offer the same schema and data branching workflow.

Current defaults also changed:

| Generation | Isolation term | Default name | Default user |
| --- | --- | --- | --- |
| EdgeDB before 5 | database | `edgedb` | `edgedb` before version 6 |
| EdgeDB 5 | branch | `main` | `edgedb` |
| Gel 6 and later | branch | `main` | `admin` |

Do not hard-code old defaults in CI. Specify the branch and user through the DSN, connection flags, or current `GEL_*` variables.

## Three Ways to Create a Branch

### Empty branch

An empty branch contains standard schemas but none of the application's schema or data:

```bash
gel branch create --empty ci-migrations-1842
```

The equivalent DDL is:

```edgeql
create empty branch ci_migrations_1842;
```

Use this when the test is the migration chain itself. Applying all committed migrations to an empty branch proves that a new environment can be built from repository history, catches missing migration files, and detects migrations that accidentally depend on developer data.

### Schema branch

Without options, `gel branch create` copies the current branch's schema but not its data:

```bash
gel branch create feature-search
```

It is equivalent to `create schema branch` and can name an explicit base:

```bash
gel branch create --from main feature-search
```

This is a good default for feature development and most isolated application tests. It starts with the base's current schema quickly, avoids copying production-like records, and lets the test or developer load deterministic fixtures.

### Data branch

Use `--copy-data` when the new branch genuinely needs the base data:

```bash
gel branch create \
  --from sanitized-baseline \
  --copy-data \
  performance-1842
```

The DDL form is `create data branch`. It copies both schema and data.

Data branches are useful for query-plan reproduction, realistic previews, or a test whose value depends on a known dataset. They consume more time and storage, and they copy every sensitive record in the source branch. Prefer a sanitized baseline rather than production for routine development.

## Which Branch Should Development Use?

For an ordinary Git feature branch:

1. Update the local Git `main` branch.
2. Ensure its corresponding Gel `main` branch has the committed migrations.
3. Create a schema branch named for the feature.
4. Switch the project to it.
5. Load development fixtures.
6. Make schema changes and create migrations there.

```bash
gel branch create feature-notifications
gel branch switch feature-notifications
gel query 'select sys::get_current_branch()'
```

Switching changes the active branch stored for the project-linked credentials. That is convenient for one developer, but it is unsafe as shared mutable state among parallel jobs.

Before integrating schema work, follow the official branch workflow for rebasing the database branch onto the updated base and then merging the compatible migration history. Source-code merge and database-branch merge are related but separate operations. A Gel branch merge is not a general conflict resolver for two sets of independently written application data.

## Which Branch Should CI Use?

CI has several distinct goals, so one branch type does not fit every job.

### Migration-chain test

Create an empty branch, apply every migration, seed minimal data, run tests, and drop it. This validates that the repository is a complete deployment artifact.

```bash
branch_name=ci_migrations_1842

gel branch create --empty "$branch_name"
gel --branch "$branch_name" migrate
gel --branch "$branch_name" query \
  'select sys::get_current_branch()'
```

### Application integration test

A schema branch can avoid replaying a long migration chain in every parallel worker. Seed deterministic fixtures after creation. Keep at least one separate job that still tests from empty.

```bash
gel branch create --from ci_schema ci_app_1842_1
```

### Upgrade or production-data rehearsal

Use a data branch only from an approved, sanitized snapshot. Apply the candidate migration and compare behavior and plans. Data copied into a branch remains data that must be protected, retained, and deleted according to policy.

## Avoid Global Branch Switching in Parallel Jobs

Do not have several workers run `gel branch switch` against one shared project configuration. The last switch wins, so a test may connect to another worker's data.

Select the branch explicitly:

```bash
gel --branch ci_app_1842_1 query 'select 1'
```

Or use an isolated process environment:

```bash
GEL_BRANCH=ci_app_1842_1 npm test
```

For a DSN, the branch occupies the path component:

```text
gel://admin:password@gel.example.com:5656/ci_app_1842_1
```

Do not print a real DSN containing credentials. Use unique, sanitized branch names and a cleanup record so abandoned branches are discoverable.

## Branches Isolate Data, Not Instance Capacity

Branches live in one Gel instance and their data is isolated, but they still share the instance's CPU, memory, storage, server version, process lifecycle, roles, and failure domain. A runaway performance test can affect another branch. A server restart affects them all.

Roles are instance-wide rather than per branch. On current Gel versions, role configuration and permissions therefore require explicit thought when CI branches share an instance. A branch is not a complete security boundary comparable to a separate account or cluster.

Use separate instances when tests need:

- different Gel major versions;
- destructive server configuration;
- independent extension packages;
- strict workload or security isolation;
- backend failover testing; or
- a separate backup and recovery boundary.

## Clean Up Safely

Dropping a branch permanently removes its data and cannot be undone. Gel also refuses to drop a branch while connections to it remain.

Terminate clients, verify the exact generated name, and then drop:

```bash
gel branch list
gel branch drop ci_app_1842_1
```

Never expand an empty or unchecked environment variable into a destructive cleanup command. Keep `main`, release, and protected branch names outside the cleanup naming pattern. An age-based sweeper should list and log candidates before deletion.

## A Practical Selection Table

| Workload | Recommended starting point | Reason |
| --- | --- | --- |
| New feature with schema changes | Schema branch from current `main` | Same schema, clean data |
| Unit tests | No database or minimal schema branch | Lowest cost |
| Integration tests | Schema branch plus fixtures | Deterministic isolation |
| Migration-chain CI | Empty branch plus `gel migrate` | Proves history from zero |
| Query performance regression | Data branch from sanitized baseline | Representative distribution |
| Production upgrade rehearsal | Restored isolated instance or approved data branch | Realistic data with controlled risk |
| Different Gel major version | Separate instance | Branches share server version |

## Official Documentation

- [Gel branches reference](https://docs.geldata.com/reference/datamodel/branches)
- [Gel branch CLI](https://docs.geldata.com/reference/using/cli/gel_branch)
- [Create a Gel branch](https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_create)
- [Switch a Gel branch](https://docs.geldata.com/reference/using/cli/gel_branch/gel_branch_switch)
- [Gel branch development workflow](https://docs.geldata.com/learn/branches)
- [Gel connection parameters](https://docs.geldata.com/reference/using/connection)
- [EdgeDB 5 branch changelog](https://docs.geldata.com/resources/changelog/5_x)

## Conclusion

Use an empty branch to validate migrations from zero, a schema branch for normal development and deterministic CI, and a data branch only when the copied dataset is both necessary and approved. Specify branches explicitly in parallel work, remember that capacity and roles remain instance-wide, and treat branch deletion as permanent data destruction.
