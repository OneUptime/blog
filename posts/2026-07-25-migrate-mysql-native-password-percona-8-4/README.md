# Percona Server 8.4 and `mysql_native_password`: Migrate Clients Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Authentication, Security, Database Upgrade

Description: Keep legacy clients available during a Percona 8.4 upgrade while moving accounts and drivers from native passwords to caching SHA-2.

---

Percona Server 8.4 inherits an important MySQL 8.4 change: the `mysql_native_password` server-side authentication plugin is disabled by default. Accounts that still depend on it cannot authenticate unless the server starts with an explicit compatibility option.

The plugin is not yet removed in MySQL 8.4. You can temporarily enable it with:

```ini
[mysqld]
mysql_native_password=ON
```

or the startup option `--mysql-native-password=ON`.

That is a migration bridge, not a permanent fix. MySQL deprecated the plugin in 8.0.34, disables it by default in 8.4, and removed it as of MySQL 9.0.0. The durable target is a supported modern client authenticating accounts with `caching_sha2_password`.

## Understand Which Side Is Failing

Authentication has both a server and client implementation:

- The account row selects a server-side authentication plugin.
- The connector must understand the corresponding client-side protocol.
- `caching_sha2_password` full authentication needs TLS or RSA-based password exchange.

An 8.4 server can be healthy while a legacy account receives:

```text
ERROR 1524 (HY000): Plugin 'mysql_native_password' is not loaded
```

A different failure occurs when the server account uses `caching_sha2_password`, but the application's driver does not support it. The server cannot make an obsolete connector implement a new protocol.

Do not solve every `Access denied` error by enabling the old plugin. Confirm the selected account, plugin, host pattern, TLS mode, and client library first.

## Inventory Every Native-Password Account

Before upgrading, run through a protected DBA session:

```sql
SELECT
  user,
  host,
  plugin,
  account_locked,
  password_expired
FROM mysql.user
WHERE plugin = 'mysql_native_password'
ORDER BY user, host;
```

The result is security-sensitive. It reveals account names, allowed client hosts, and authentication state. Store it in the upgrade evidence repository with restricted access.

Map each row to an owner and client:

- application services and connection pools
- replication channels
- backup and monitoring agents
- schema migration tools
- reporting and extract jobs
- DBA clients
- proxy health checks
- dormant or emergency accounts

An account with no known owner should be disabled and investigated, not automatically migrated.

Account matching includes both `user` and `host`. Testing `'billing'@'localhost'` does not prove that `'billing'@'10.%'` works.

## Establish a Modern Administrative Path First

Before changing server startup behavior, ensure at least one named administrative account:

- uses `caching_sha2_password`
- can connect with the approved current client
- uses TLS for remote access
- has only the required administrative privileges
- is tested through the same network and proxy path needed during the upgrade

Create or alter an account according to policy:

```sql
CREATE USER 'upgrade_admin'@'10.20.30.%'
  IDENTIFIED WITH caching_sha2_password
  BY '<generated-secret>'
  REQUIRE SSL;
```

Grant only the privileges required by the runbook. Do not copy a broad `GRANT ALL` example into production.

Test the account before the maintenance window:

```bash
mysql \
  --host=percona-canary.example.internal \
  --user=upgrade_admin \
  --password \
  --ssl-mode=VERIFY_IDENTITY
```

Configure the trusted certificate authority used by the endpoint. `VERIFY_IDENTITY` both verifies the certificate chain and checks the host name.

## Upgrade Drivers Before Altering Accounts

For each service, identify the actual protocol library. The `mysql` CLI installed on the same host may be unrelated to the application.

Record:

- connector name and version
- runtime and framework version
- whether the library is statically bundled
- support for `caching_sha2_password`
- TLS support and trust-store configuration
- connection-pool behavior after password rotation

Upgrade the driver in a non-production environment and connect it to an 8.4 canary account. Test:

- initial connection with an empty server authentication cache
- reconnection after a server restart
- pooled connection creation under load
- TLS hostname verification
- password rotation and secret reload
- expected authentication failures

Cached fast authentication can make an incomplete test appear successful. A server restart clears the in-memory authentication cache and exercises the full authentication path.

## Why the Existing Hash Cannot Be Converted

Changing from `mysql_native_password` to `caching_sha2_password` changes the password-verification representation. MySQL cannot safely derive the plaintext password for the new plugin from the stored native hash.

The migration therefore needs a password value:

```sql
ALTER USER 'billing_app'@'10.20.40.%'
  IDENTIFIED WITH caching_sha2_password
  BY '<new-secret>'
  REQUIRE SSL;
```

This is also a credential rotation. Coordinate the database change with the secret manager and application deployment.

Do not copy the `authentication_string` from one plugin into another account. Do not update `mysql.user` directly.

## Use One of Two Staging Patterns

### Pattern 1: Rotate an Existing Account

Use this when the service can atomically reload or deploy the new password:

1. deploy a connector that supports `caching_sha2_password`
2. place the new password in the secret manager
3. alter the account plugin and password
4. restart or reload all application instances
5. verify new and recycled connections
6. revoke the old secret

The account has a short interval in which old application instances can fail. Make that interval explicit and observable.

### Pattern 2: Create a Parallel Account

Use this when a gradual application rollout is safer:

```sql
CREATE USER 'billing_app_sha2'@'10.20.40.%'
  IDENTIFIED WITH caching_sha2_password
  BY '<new-secret>'
  REQUIRE SSL;
```

Reproduce the minimum required grants after reviewing the old account:

```sql
SHOW CREATE USER 'billing_app'@'10.20.40.%';
SHOW GRANTS FOR 'billing_app'@'10.20.40.%';
```

Do not blindly copy account options that preserve the deprecated plugin. Deploy a canary with the new user, widen traffic, then lock and later drop the old account through the normal access-removal process.

The parallel-account pattern increases temporary credential count, so set an expiry date and ownership record.

## Keep 8.4 Compatible During the Transition

If production reaches 8.4 before every account is migrated, add the compatibility setting before the first 8.4 start:

```ini
[mysqld]
mysql_native_password=ON
```

Restart in a rehearsed maintenance procedure, then verify:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.plugins
WHERE PLUGIN_NAME IN
  ('mysql_native_password', 'caching_sha2_password');
```

The old plugin should be enabled only while the inventory still contains approved native accounts. `caching_sha2_password` is built in and is the normal default in 8.4.

Do not configure `default_authentication_plugin`. MySQL removes that variable in 8.4. Account authentication is explicit, and the current authentication policy governs defaults.

Track the compatibility exception like any other security debt:

- affected accounts
- application owner
- driver-upgrade ticket
- deadline
- telemetry or logs proving ongoing use
- tested removal procedure

## Migrate Replication Accounts Carefully

Replication is a client too. If a channel uses a native-password account, update the replica's ability to authenticate before altering that account.

With `caching_sha2_password`, use an encrypted replication connection:

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_USER = 'replication_sha2',
  SOURCE_PASSWORD = '<secret-from-vault>',
  SOURCE_SSL = 1,
  SOURCE_SSL_CA = '/etc/mysql/tls/ca.pem',
  SOURCE_SSL_VERIFY_SERVER_CERT = 1;

START REPLICA;
```

Options omitted from `CHANGE REPLICATION SOURCE TO` normally retain their prior values, but review the statement documentation for exceptions. Confirm the source identity and channel state after the change:

```sql
SHOW REPLICA STATUS\G
```

Avoid putting the password in a shared SQL transcript or shell command. The replica must retain or receive a credential to reconnect, so align the channel with the organization's secret rotation and metadata-access controls.

## Verify Progress Continuously

The migration is not complete when one application connects. Re-run:

```sql
SELECT user, host
FROM mysql.user
WHERE plugin = 'mysql_native_password'
ORDER BY user, host;
```

For each migrated service, observe new connections after:

- a normal deployment
- a connection-pool recycle
- a server restart in staging
- a secret rotation
- a failover to another server

Check server logs for authentication failures without logging passwords or full connection strings.

## Diagnose Common Failures

### Plugin Not Loaded

If a native account receives error 1524 on 8.4, either:

- enable `mysql_native_password` temporarily and restart, or
- connect through a modern administrative account and migrate the affected account

Do not use an emergency grant-table bypass as the planned upgrade method.

### Client Does Not Support `caching_sha2_password`

Upgrade the connector. Reverting the account to native authentication only postpones the same removal problem.

### Public Key Retrieval or Insecure Transport Error

Use TLS with certificate validation. MySQL permits RSA-based password exchange on an unencrypted connection, but enabling unauthenticated key retrieval casually can create interception risk.

### Works Until Restart

The connection may have used cached authentication. Test full authentication after the cache is cleared and verify TLS or RSA configuration.

### Correct User, Wrong Host Row

Inspect which account matched:

```sql
SELECT USER(), CURRENT_USER();
```

`USER()` shows the presented client identity. `CURRENT_USER()` shows the account row selected for privilege checks.

## Remove the Compatibility Bridge

When the native-account inventory is empty:

1. verify all production and emergency clients use supported connectors
2. remove `mysql_native_password=ON` from every server's configuration
3. restart one replica or canary first
4. test application, replication, backup, and monitoring connections
5. rotate the rest of the topology
6. confirm the plugin is unavailable or disabled as expected
7. close the exception record

Keep no undocumented native account as a break-glass mechanism. A current, local, least-privilege administrative path is safer and remains viable in later releases.

## Official Documentation

- [Percona Server authentication methods](https://docs.percona.com/percona-server/8.4/authentication-methods.html)
- [Percona Server 8.4 upgrade checklist](https://docs.percona.com/percona-server/8.4/upgrade-checklist-8.4.html)
- [MySQL native pluggable authentication](https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html)
- [MySQL caching SHA-2 authentication](https://dev.mysql.com/doc/refman/8.4/en/caching-sha2-pluggable-authentication.html)
- [MySQL pluggable-authentication client compatibility](https://dev.mysql.com/doc/refman/8.4/en/pluggable-authentication.html)
- [MySQL ALTER USER](https://dev.mysql.com/doc/refman/8.4/en/alter-user.html)
- [MySQL CHANGE REPLICATION SOURCE TO](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
