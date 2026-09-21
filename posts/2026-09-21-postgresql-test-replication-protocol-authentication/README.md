# How to Test PostgreSQL Replication Authentication with a Replication Protocol Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Security, SQL

Description: Test PostgreSQL physical and logical replication authentication with IDENTIFY_SYSTEM, then isolate HBA, TLS, role, and database-access failures.

A successful `psql` connection proves that an ordinary database session can authenticate. It does not prove that a standby or logical replication worker can connect in replication mode. That mode changes the startup request and, for physical replication, which `pg_hba.conf` database rule is relevant.

Use a read-only replication command to test the actual path. PostgreSQL documents `psql` connections with the `replication` connection parameter specifically for testing replication commands. The examples below target PostgreSQL 18. [Streaming replication protocol](https://www.postgresql.org/docs/18/protocol-replication.html)

## Match the real client's connection

Run the test from the replica host, container, or equivalent network path. Use the same endpoint, port, database, role, TLS settings, and client certificate requirements as the failing replication connection. Testing from an administrator's laptop may match a completely different HBA rule.

Use a direct database endpoint unless your proxy explicitly supports replication protocol connections. A normal SQL pooler's successful health check is not proof that it forwards replication startup parameters.

The examples use interactive password prompting with `-W`. For unattended checks, provision a protected libpq password file or your existing secret mechanism; do not place real passwords in command history.

## Test physical replication

Run:

```bash
psql -X -W -v ON_ERROR_STOP=1 \
  "host=publisher.example.com port=5432 user=physical_replicator dbname=postgres replication=true sslmode=verify-full connect_timeout=5 application_name=physical_auth_probe" \
  -c 'IDENTIFY_SYSTEM;'
```

`replication=true` requests physical walsender mode. `IDENTIFY_SYSTEM` returns the cluster system identifier, timeline, WAL position, and database field; the database is null for a physical connection. The command identifies the server without creating a slot or consuming a persistent replication position.

Record the system identifier and compare it with the intended cluster. Authentication can succeed against the wrong environment, especially when endpoints or DNS records have changed.

Do not replace this command with `SELECT 1` in physical mode. Physical replication accepts a restricted replication command set, rather than arbitrary SQL. [Replication connection modes](https://www.postgresql.org/docs/18/libpq-connect.html)

## Test logical replication separately

Logical replication connects to a specific database:

```bash
psql -X -W -v ON_ERROR_STOP=1 \
  "host=publisher.example.com port=5432 user=logical_replicator dbname=app replication=database sslmode=verify-full connect_timeout=5 application_name=logical_auth_probe" \
  -c 'IDENTIFY_SYSTEM;'
```

Expect the returned database field to be `app`. `replication=database` allows replication commands and ordinary SQL through the simple query protocol, so a further read can test a published table:

```bash
psql -X -W -v ON_ERROR_STOP=1 \
  "host=publisher.example.com port=5432 user=logical_replicator dbname=app replication=database sslmode=verify-full connect_timeout=5" \
  -c 'SELECT id FROM public.orders LIMIT 1;'
```

This read assumes that table and column exist. Passing the connection probe does not prove initial-copy permissions: the account also needs access to the source schema and published table, including the necessary `SELECT` privilege. [Logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html)

## Check HBA rules in the right order

A narrowly scoped pair of TLS-only rules could look like:

```text
hostssl replication physical_replicator 192.0.2.40/32 scram-sha-256
hostssl app         logical_replicator  192.0.2.40/32 scram-sha-256
```

Replace the documentation address with the real source address seen by PostgreSQL. Physical connections match the special `replication` database entry; logical connections match their actual database name. PostgreSQL uses the first matching entry and does not retry later rules after authentication fails. [HBA matching rules](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)

On the publisher, an administrator can inspect parsing problems and role attributes:

```sql
SELECT line_number, type, database, user_name, address, auth_method, error
FROM pg_hba_file_rules
ORDER BY line_number;

SELECT rolname, rolcanlogin, rolreplication, rolsuper
FROM pg_roles
WHERE rolname IN ('physical_replicator', 'logical_replicator');
```

Both example accounts should have `LOGIN` and `REPLICATION`; neither needs to be superuser. After an approved HBA edit, reload configuration and repeat the probe from the same source. Remember that the file-rules view describes file contents; reload success and the actual connection test establish that the intended rule is usable.

## Interpret failures without widening access

A connection timeout points first to routing, firewalls, listener address, or the endpoint. An HBA rejection means the server was reached but no acceptable rule matched the requested connection properties. A password failure means the matched authentication method rejected the supplied credential. A replication-role error means ordinary login authority was insufficient.

For certificate failures, verify the requested hostname, server certificate, trusted CA, and client certificate configuration. Keep `sslmode=verify-full` while repairing that identity chain instead of changing the probe to a weaker mode and declaring the production path healthy. The mode verifies both the certificate chain and hostname. [libpq TLS options](https://www.postgresql.org/docs/18/libpq-connect.html)

Finally, distinguish authentication from full replication readiness. A passing `IDENTIFY_SYSTEM` does not validate WAL availability, an existing slot, publication membership, decoding configuration, or subscriber apply permissions. Once this small probe passes, move to the specific failing operation and its logs. That separation keeps a missing table grant from turning into an unnecessary network or superuser change.
