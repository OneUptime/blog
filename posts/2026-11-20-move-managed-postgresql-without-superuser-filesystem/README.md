# Move Managed PostgreSQL Without Superuser or Server Filesystem Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Data Migration, Cloud

Description: Plan a client-side PostgreSQL migration across managed providers with explicit privileges, extension compatibility, ownership mapping, and cutover validation.

A migration guide that starts by copying the server's data directory is of little use when neither provider exposes the operating system. The same problem appears when a restore script assumes unrestricted superuser privileges that a managed database never grants.

You can often move the application database through normal database connections. The important work is discovering which objects and privileges are portable, then rehearsing the exact restore under the destination role you will actually use.

This example uses PostgreSQL 17 clients with PostgreSQL 17 source and destination databases. It chooses a planned write-pause migration with a client-side archive. It does not promise zero downtime or provide a cross-version upgrade procedure.

## Separate database access from host access

`pg_dump` and `pg_restore` run on a client machine that can reach both services. The archive is written to that client's storage; it does not require access to the database host's filesystem.

Similarly, PostgreSQL `COPY` using a server filename refers to a file on the database server, while `COPY ... TO STDOUT` and `FROM STDIN` transfer data over the connection. The transport distinction matters when evaluating tools, although a table-only copy does not replace a complete schema migration. [PostgreSQL COPY semantics](https://www.postgresql.org/docs/17/sql-copy.html).

Do not equate a provider's administrative role with PostgreSQL superuser. For example, RDS documents that its `postgres` account is not a PostgreSQL superuser and that host operating-system access is unavailable. [RDS administrative role boundaries](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Roles.rds_superuser.html).

## Inventory capabilities before exporting data

Make a migration manifest covering schemas, tables, sequences, functions, extensions, large objects, roles, grants, row-security policies, and external dependencies. Include scheduled jobs and integrations that exist outside the database.

Run this read-only query on the source to list installed extensions:

```sql
SELECT extname, extversion, extnamespace::regnamespace AS schema_name
FROM pg_catalog.pg_extension
ORDER BY extname;
```

Then inspect the destination's available versions:

```sql
SELECT name, version, installed, superuser, trusted
FROM pg_catalog.pg_available_extension_versions
ORDER BY name, version;
```

Compare actual versions and installation requirements. Availability in the view is useful evidence, but the managed provider's policy and your role still determine what you can install. [Installed extension catalog](https://www.postgresql.org/docs/17/catalog-pg-extension.html), [available extension versions](https://www.postgresql.org/docs/17/view-pg-available-extension-versions.html).

A dump cannot carry a missing extension binary into the destination service. Resolve that incompatibility before scheduling the cutover. The answer might be a supported extension version, an application change, or a different destination.

Check encoding, locale and collation requirements, database settings, and any references to provider-specific roles or schemas. Record which components will be recreated through provider APIs rather than through the archive.

## Prove the source role can read the full intended scope

The exporting role needs access to every required object. “Can run the application” and “can export the whole application database” are different privileges.

Row-level security can hide rows from ordinary queries. By default, `pg_dump` attempts to avoid a silently filtered dump and errors when the user cannot bypass relevant row security. Do not solve that failure by enabling row security for a supposedly complete export without accepting and documenting the reduced scope. [pg_dump row-security behavior](https://www.postgresql.org/docs/17/app-pgdump.html).

Use the provider's supported delegation process for a temporary migration role. Keep its access narrow enough for the migration's scope, but test that scope completely. A rehearsal that exports one accessible table does not establish access to every table, sequence, or large object.

## Choose the migration path honestly

| Situation | Suitable starting path |
|---|---|
| A write pause covers export, restore and checks | Client-side logical archive |
| Downtime must be shorter | Supported initial copy plus coordinated change replication |
| Required replication permissions are unavailable | Negotiate a supported provider migration service or accept a longer pause |
| Destination lacks essential objects or behavior | Resolve the incompatibility before moving data |

Logical replication has its own privileges and security requirements. Managed-provider support for those operations must be verified; an ordinary login does not automatically permit publication or subscription administration. [PostgreSQL logical replication security](https://www.postgresql.org/docs/17/logical-replication-security.html).

Do not take a dump, let the source keep accepting writes, and later call the restored copy current. A consistent dump represents a point in time, not every change that followed it. [PostgreSQL logical backup behavior](https://www.postgresql.org/docs/17/backup-dump.html).

## Create a client-side archive in a rehearsal

Use an approved migration host with encrypted storage and network access to both endpoints. Install PostgreSQL 17 tools. Provision protected password files or another approved authentication mechanism; do not put passwords in shell commands. Replace the endpoint, database, role, CA path, and output directory below. [Password file handling](https://www.postgresql.org/docs/17/libpq-pgpass.html).

```bash
set -e
umask 077
mkdir migration-run-unique

pg_dump \
  --dbname='host=REPLACE_SOURCE_ENDPOINT port=5432 dbname=app user=migration_reader sslmode=verify-full sslrootcert=/path/to/source-ca.pem connect_timeout=5' \
  --format=custom \
  --file=migration-run-unique/app.dump \
  --no-password

pg_restore --list migration-run-unique/app.dump \
  > migration-run-unique/archive-contents.txt
```

The custom archive supports later inspection and restoration. Check command exit status and warnings; an incomplete archive is not a migration artifact. Listing its contents is only a structural check. [pg_dump archive formats](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore listing](https://www.postgresql.org/docs/17/app-pgrestore.html).

Review the schema and executable objects through your normal change review. Restoring an archive executes SQL from the source, so use a trusted artifact and an isolated destination.

## Restore under an explicit ownership plan

Have the destination administrator provision a new, empty application database with the approved encoding and locale. Create an application owner role and a migration login authorized to assume it. Preapprove any provider-managed extension installation and reconcile it with the archive before running the restore.

This example restores into that empty rehearsal database. It deliberately omits cleanup or overwrite options:

```bash
pg_restore \
  --dbname='host=REPLACE_TARGET_ENDPOINT port=5432 dbname=app_rehearsal user=migration_loader sslmode=verify-full sslrootcert=/path/to/target-ca.pem connect_timeout=5' \
  --role=app_owner \
  --no-owner --no-privileges --no-tablespaces \
  --single-transaction --exit-on-error \
  --no-password \
  migration-run-unique/app.dump
```

These flags suppress source ownership, privilege grants, and tablespace assignments; they do not make arbitrary privileged objects portable. A single transaction avoids a partially committed SQL restore, but can be impractical for large archives because of lock requirements. It cannot be combined with parallel restore jobs. [Restore option semantics](https://www.postgresql.org/docs/17/app-pgrestore.html).

Reapply reviewed grants and ownership boundaries before enabling application access. A single owner may be unsuitable for schemas with different trust boundaries or security-definer functions. Treat the example as a starting ownership policy, not a shortcut around security review.

If restoration fails on an unsupported object, investigate it. Do not ignore errors until the command appears to finish. Fix the manifest or compatibility plan and rehearse again in a clean, approved target.

## Rehearse the real cutover boundary

Measure export, transfer, restore, and validation time with representative data. Verify row coverage, important relationships, sequence behavior, extensions, permissions, and application queries. Refresh planner statistics through the approved maintenance procedure before judging performance. [PostgreSQL restore guidance](https://www.postgresql.org/docs/17/backup-dump.html).

For the final write-pause migration, stop all source writers, including queues and scheduled jobs, and let active transactions finish. Create the final archive only after that boundary. Restore, validate, and introduce controlled test traffic before enabling normal target writers.

Keep the source protected from new writes during the decision window. Once the destination accepts business writes, reverting the endpoint alone can lose or split those changes. Define reconciliation and rollback responsibilities before cutover rather than improvising them afterward.

The migration is complete when the application works under the destination's real permissions and the data is accounted for. Filesystem access and superuser privileges are not prerequisites for every move, but explicit compatibility and ownership decisions are.
