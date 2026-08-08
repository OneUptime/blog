# Diagnose Gel Schema and Migration History Drift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Schema, Migrations, Drift, Troubleshooting

Description: Compare Gel schema source, filesystem migrations, and database history safely before repairing a drifted branch.

---

A Gel migration incident can involve three different states:

1. the desired SDL in `dbschema/*.gel`;
2. the content-addressed migration chain in `dbschema/migrations/*.edgeql`; and
3. the migration history and live schema stored in one specific Gel branch.

These states are allowed to differ briefly during development. They are not interchangeable. Copying a schema file does not rewrite database history, and renaming a migration hash does not make two histories equivalent.

The safe response is to identify the target branch, compare both histories without applying anything, determine how the divergence was created, and repair from an authoritative source.

## Freeze Schema Changes and Confirm the Target

Pause migration jobs, `gel watch --migrate`, direct DDL, and branch cleanup while evidence is collected. If the data matters, take a documented dump or storage snapshot before changing history.

Confirm which project and branch the CLI will use:

```bash
gel project info
gel query 'select sys::get_current_branch()'
```

For a remote environment, prefer an explicit instance or DSN and branch in every command. A frequent apparent drift is simply comparing a feature branch's files with `main`, or a staging checkout with a production DSN.

Record the server version too:

```bash
gel query 'select sys::get_version_as_str()'
```

Gel 6 naming uses `gel.toml`, `.gel` schema files, and `GEL_*` connection variables. Legacy EdgeDB projects may still use `edgedb.toml`, `.esdl`, and `EDGEDB_*`. Mixed naming can cause tooling to discover a different project contract than the operator expects.

## Ask the CLI for Status Before Applying

Run:

```bash
gel migration status
```

Then print both migration chains independently:

```bash
gel migration log --from-fs
gel migration log --from-db
```

For long histories, compare the newest revisions first:

```bash
gel migration log --from-fs --newest-first --limit 10
gel migration log --from-db --newest-first --limit 10
```

Save this output with the incident. The first revision where the chains differ is more useful than the number of files.

## Classify the Mismatch

### Database behind the filesystem

This can be the normal pre-deployment state: the repository contains reviewed migrations that the branch has not applied. Before running `gel migrate`, verify that the database's current revision is an ancestor of the filesystem chain, inspect every pending migration, back up, and test against representative data.

Do not assume that a clean history guarantees successful application. Existing objects may violate a new required property, exclusivity constraint, or type conversion.

### Database ahead of the filesystem

First look for the missing repository artifact:

- wrong Git revision or incomplete deployment bundle;
- migration file omitted by an image copy rule;
- migration committed on another branch;
- generated or downloaded artifact not restored; or
- direct DDL recorded as a database migration.

The preferred repair is to recover the exact original migration files from version control, CI artifacts, or the deployment that applied them. This preserves the content-addressed chain.

If the extra database revision was legitimately created through direct DDL and no original file exists, Gel provides:

```bash
gel migration extract
```

The official migration guide describes `extract` as retrieving database migrations and writing proper files into the schema migration directory. After extraction, make the `.gel` SDL describe the same live schema. Use schema introspection as evidence:

```bash
gel describe schema
```

Review the extracted DDL and resulting Git diff. Extraction is not permission to accept an unknown production change without understanding it.

### Histories diverge after a common revision

Two different successors to the same migration are not solved by copying the newest file over the other. Find which code branch created each successor and whether both schema changes must survive.

The safest recovery is often to:

1. preserve both histories and dumps;
2. choose the authoritative migration chain in version control;
3. reproduce the merge in an isolated Gel branch;
4. create a new migration from the reconciled SDL;
5. test data transformation and application compatibility; and
6. deploy through the normal migration path.

If a production branch has already applied an unwanted divergent history, a fresh instance or branch restored and migrated through the authoritative chain may be safer than manually rewriting history. Migration rewrite features are advanced tools, not a routine incident shortcut.

### SDL differs from the last filesystem revision

This is expected after editing schema source and before creating a migration. Run:

```bash
gel migration create
```

Interactively inspect the proposed changes, but do not accept destructive guesses merely to make status clean. The migration planner may ask whether a field was renamed or dropped and recreated; those choices have different data outcomes.

In production, create and review the migration in development rather than interactively answering prompts against the production branch.

## Respect Content-addressed Migration IDs

Gel migration names are calculated from migration contents, including the parent revision. Editing a file after creation without updating its ID produces a hash error. More importantly, editing a migration already applied somewhere changes history underneath that environment.

For a new, unapplied migration that needs a data statement, use the documented editor command:

```bash
gel migration edit
```

It updates the most recent migration's ID after editing. Coordinate with every environment and developer because descendants also reference parent IDs. Once a migration has been shared or applied, append a corrective migration rather than rewriting it unless the team is deliberately performing a documented history rewrite.

Never make the error disappear by changing only the `CREATE MIGRATION` hash to an arbitrary value. The hash must match content, and the `ONTO` parent must match the actual chain.

## Account for Development-mode Migrations

`gel watch --migrate` and `gel migrate --dev-mode` apply iterative development changes without immediately creating a final source-controlled migration. This can make a development branch appear ahead while the schema is being prototyped.

The documented finalization flow is:

```bash
gel migration create
gel migrate --dev-mode
```

The first command writes the final migration; the second aligns the local development history with it. Do not expose a shared staging or production branch to a developer's watch process.

## Validate the Repair in a Disposable Branch

Before touching the affected environment, create an isolated branch or instance and test the complete chain from the same starting state.

For validating that repository migrations can build a database from scratch, an empty branch is strongest:

```bash
gel branch create --empty drift-rehearsal
gel --branch drift-rehearsal migrate
```

Load sanitized representative data, apply the disputed transition, and exercise application reads and writes. Drop the rehearsal branch only after preserving the result and closing connections.

For a production repair, also verify:

- live schema matches intended SDL;
- database and filesystem histories end at the same revision;
- a fresh empty branch can apply the full chain;
- generated clients are rebuilt from the final schema;
- no unauthorized DDL path remains; and
- the backup restores into an empty compatible target.

## Prevent Recurrence

- Apply production migrations from an immutable, versioned artifact.
- Include all `dbschema` files in image and package tests.
- Run `migration status` before and after deployment.
- Block bare DDL in managed environments except through an approved incident path.
- Give each CI job an isolated branch and explicit connection target.
- Never run `gel watch` against a shared environment.
- Treat migration files as immutable after merge.
- Test the chain from an empty branch, not only the latest schema against a long-lived database.

## Official Documentation

- [Gel migrations model](https://docs.geldata.com/reference/datamodel/migrations)
- [Gel migration CLI](https://docs.geldata.com/reference/using/cli/gel_migration)
- [Gel migration log](https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_log)
- [Gel migration guide](https://docs.geldata.com/resources/guides/migrations/guide)
- [Gel local development workflow](https://docs.geldata.com/learn/localdev)
- [Gel projects and migration revision requirements](https://docs.geldata.com/reference/using/projects)
- [Gel branches](https://docs.geldata.com/reference/datamodel/branches)

## Conclusion

Gel drift is not one diff. It is a disagreement among desired SDL, filesystem history, database history, and sometimes the selected branch. Compare those states before applying anything, recover exact migration artifacts where possible, use `migration extract` only for understood database-side history, and rehearse the repair from an empty or restored branch before changing production.
