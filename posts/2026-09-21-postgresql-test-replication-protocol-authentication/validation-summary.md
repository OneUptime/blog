# Validation Summary: How to Test PostgreSQL Authentication Through the Replication Protocol

## Status

validated

## Post Type

Technical troubleshooting guide with command-line, SQL, and authentication configuration examples.

## Technologies Covered

- PostgreSQL 18 physical and logical replication
- Streaming replication protocol and `IDENTIFY_SYSTEM`
- `psql` and libpq connection parameters
- `pg_hba.conf`, SCRAM-SHA-256, and role privileges
- TLS certificate verification and GSSAPI encryption
- PostgreSQL system views and SQL access checks

## Sources Consulted

- [PostgreSQL 18 streaming replication protocol](https://www.postgresql.org/docs/18/protocol-replication.html): replication startup modes, simple-query restrictions, and `IDENTIFY_SYSTEM` results.
- [PostgreSQL 18 libpq connection parameters](https://www.postgresql.org/docs/18/libpq-connect.html): connection-string syntax, replication options, timeouts, application names, TLS, and GSSAPI precedence.
- [PostgreSQL 18 psql reference](https://www.postgresql.org/docs/18/app-psql.html): `-X`, `-W`, `-w`, `-v`, `-c`, and `ON_ERROR_STOP`.
- [PostgreSQL 18 logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html): replication-role attributes, initial-copy permissions, and subscriber permissions.
- [PostgreSQL 18 HBA configuration](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html): physical versus logical matching, rule precedence, explicit rejection, `hostssl`, SCRAM, and reload behavior.
- [PostgreSQL 18 pg_hba_file_rules](https://www.postgresql.org/docs/18/view-pg-hba-file-rules.html): view columns, rule ordering, parsing errors, and current-file versus loaded-state semantics.
- [PostgreSQL 18 pg_roles](https://www.postgresql.org/docs/18/view-pg-roles.html): queried role columns.
- [PostgreSQL 18 role attributes](https://www.postgresql.org/docs/18/role-attributes.html): login and replication authorization.
- [PostgreSQL 18 password files](https://www.postgresql.org/docs/18/libpq-pgpass.html): unattended authentication and file permissions.
- [PostgreSQL 18 SSL support](https://www.postgresql.org/docs/18/libpq-ssl.html): CA trust, hostname verification, and client certificates.
- [PostgreSQL 18 privileges](https://www.postgresql.org/docs/18/ddl-priv.html): database, schema, and table access.

## Issues Found

1. **Unattended password handling:** The text recommended a password file without explaining that the examples' `-W` still forces a prompt. Added an instruction to replace `-W` with `-w` for unattended checks. This uses configured credentials and fails instead of prompting when credentials are unavailable.
2. **TLS probe could select GSSAPI:** `sslmode=verify-full` does not override available GSSAPI encryption. Added `gssencmode=disable` to all three TLS probe connection strings and explained why, so these examples actually test TLS certificate verification and the illustrated `hostssl` path.
3. **HBA inspection ordering:** Ordering only by `line_number` can interleave rules from included files and obscure their effective matching order. Added `rule_number` and `file_name` to the query and ordered valid rules by `rule_number`, retaining invalid entries at the end with file and line information.
4. **HBA rejection diagnosis:** The original explanation omitted explicitly matched `reject` rules. Updated it to distinguish no matching rule from a matching rule that denies access.

## Review Notes

- Confirmed the physical and logical `IDENTIFY_SYSTEM` probes, database-field behavior, restricted physical command set, and ordinary SQL support in logical walsender mode. Neither probe creates a replication slot or advances a persistent slot position.
- Checked all CLI flags, connection-string parameters, SQL view columns, and HBA fields against PostgreSQL 18 documentation. No deprecated options are used.
- Confirmed that `LOGIN` and `REPLICATION` suffice without superuser status, subject to the relevant HBA and database access checks. The table read requires the named objects and privileges; a successful single-column read does not establish all initial-copy permissions.
- The HBA view reports current file contents, not necessarily the loaded configuration, and is restricted to superusers by default. On Windows, HBA edits apply to subsequent connections without the Unix-style reload requirement.
- TLS examples require an appropriate trusted CA and any client certificate required by the deployment. The host, address, roles, database, and table are illustrative and must match the real environment.
- The post correctly separates connection authorization from WAL, slot, publication, decoding, and subscriber readiness.
- All five linked PostgreSQL documentation pages resolved to the intended version-specific resources. The author profile link also resolved successfully.
- Validation consisted of documentation review and shell syntax checks. The probes were not executed against a configured PostgreSQL replication deployment; no endpoint, credentials, or certificates were supplied.
- Existing README edits were preserved; only the four corrections described above were applied during this review.
