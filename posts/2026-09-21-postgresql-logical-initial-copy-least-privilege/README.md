# How to Grant PostgreSQL Logical Initial Copy Permissions Without Superuser

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Security, SQL

Description: Grant the publisher and subscriber permissions needed for logical initial copy while keeping replication accounts out of the superuser role.

Logical replication has two different permission paths: the subscriber connects to the publisher to copy and decode data, then applies that data under local subscriber permissions. Granting `REPLICATION` alone does not authorize the initial table copy.

This example targets PostgreSQL 18, with database `app`, schema `sales`, and table `sales.orders`. An administrator performs privileged provisioning; the ongoing publisher connection and subscription owner are non-superusers. Managed services may expose provider-specific equivalents for role provisioning.

## Provision the publisher connection account

An authorized administrator creates the login role:

```sql
CREATE ROLE logical_reader
  LOGIN REPLICATION NOSUPERUSER NOCREATEDB NOCREATEROLE;
```

Set its password through your normal secret provisioning process; in an interactive `psql` session, `\password logical_reader` avoids embedding a literal password in the SQL example. Creating a replication-capable role itself requires elevated authority; an ordinary application owner cannot grant that attribute to itself. [CREATE ROLE](https://www.postgresql.org/docs/18/sql-createrole.html)

Grant only the database, schema, and table access needed for this publication:

```sql
GRANT CONNECT ON DATABASE app TO logical_reader;
GRANT USAGE ON SCHEMA sales TO logical_reader;
GRANT SELECT ON TABLE sales.orders TO logical_reader;
```

The initial copy requires `SELECT` on published tables. `LOGIN`, `REPLICATION`, and a matching authentication rule are separate requirements. The replication account does not need to own the source table or publication. [Logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html)

Add a narrowly scoped publisher `pg_hba.conf` entry, substituting the subscriber's real source address:

```text
hostssl app logical_reader 192.0.2.40/32 scram-sha-256
```

Logical replication selects a database, so match `app`; the special `replication` database keyword is for physical replication connections. The server uses the first matching HBA rule. Reload through your normal configuration mechanism and check for parsing errors. [pg_hba.conf matching rules](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)

## Keep publication ownership separate

The owner of `sales.orders` creates the publication after receiving `CREATE` on `app` if needed:

```sql
CREATE PUBLICATION orders_pub FOR TABLE sales.orders;
```

Explicit table publications avoid the elevated permissions associated with publishing all tables or all tables in a schema. Review the table list whenever you change it; the logical connection's authority is broader than a named publication access grant, because publications do not provide that grant boundary.

For future tables, either issue explicit grants during each migration or use deliberately scoped default privileges:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE sales_owner IN SCHEMA sales
GRANT SELECT ON TABLES TO logical_reader;
```

This affects new tables created by `sales_owner`, not existing tables or tables created by another role. Use it only if every future table in that schema should be readable by this account. [ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html)

## Provision the subscriber owner

On the subscriber, an administrator grants the local role permission to create subscriptions and objects in `app`:

```sql
CREATE ROLE subscription_owner LOGIN NOSUPERUSER;
GRANT pg_create_subscription TO subscription_owner;
GRANT CONNECT, CREATE ON DATABASE app TO subscription_owner;
```

Set its login credentials through the same secret process. Connect as `subscription_owner`, create `sales`, and create an empty `sales.orders` matching the published columns and types. For a simple example:

```sql
CREATE SCHEMA sales;
CREATE TABLE sales.orders (
    id bigint PRIMARY KEY,
    status text NOT NULL
);
```

This role owns the destination table, so no additional role switch is needed for that table. If existing tables have different owners, the subscription owner needs permission to `SET ROLE` to each owner under the default `run_as_owner = false` behavior. Test that relationship explicitly instead of granting superuser or changing the execution model to bypass an error.

Create the subscription through a secure deployment session, supplying the provisioned publisher secret:

```sql
CREATE SUBSCRIPTION orders_sub
CONNECTION 'host=publisher.example.com dbname=app user=logical_reader password=REPLACE_WITH_PROVISIONED_SECRET sslmode=verify-full gssencmode=disable options=-crow_security=off'
PUBLICATION orders_pub;
```

The placeholder must be replaced with a correctly escaped secret through your provisioning tool. Non-superuser-owned subscriptions require password authentication by default. Limit access to deployment logs and subscription connection information. [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html) The `gssencmode=disable` setting forces the TLS path required by the illustrated `hostssl` rule; otherwise available GSSAPI encryption takes precedence over `sslmode`. [libpq connection options](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-CONNECT-SSLMODE)

## Test the actual copy permissions

From the subscriber environment, connect to the publisher as `logical_reader` using the same TLS identity, database, and secret. Test reading `sales.orders`, then inspect grants:

```sql
SELECT has_database_privilege(current_user, 'app', 'CONNECT'),
       has_schema_privilege(current_user, 'sales', 'USAGE'),
       has_table_privilege(current_user, 'sales.orders', 'SELECT');
```

All three should return true. Row-level security needs separate consideration: `row_security=off` does not bypass policies; it causes an error when a policy would affect the query. Resolve that policy design intentionally rather than granting `BYPASSRLS` automatically.

Finally, confirm the subscriber table reaches `srsubstate = 'r'` in `pg_subscription_rel`, compare copied rows, and replicate a new insert. A successful empty-table subscription is not a sufficient permission test.

If copying fails, read both servers' logs, repair the exact grant or policy, and let synchronization retry. Re-enable a subscription disabled by `disable_on_error` only after correcting its cause. Retain these narrow grants for future resynchronization and new-table copies, and make grant review part of every publication change.
