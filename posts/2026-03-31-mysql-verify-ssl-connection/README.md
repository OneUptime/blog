# How to Verify SSL Connection in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SSL, Security, Connection, Verification

Description: Learn how to verify that your MySQL connection is using SSL encryption by checking session variables and status indicators.

---

After configuring SSL on your MySQL server and clients, it is important to confirm that connections are actually encrypted. MySQL provides several built-in status variables and session functions that let you inspect the current connection's SSL status from both the server and client sides.

## Checking SSL Status on the Server

After starting MySQL with SSL certificates configured, verify the server loaded them:

```sql
SHOW VARIABLES LIKE 'have_ssl';
SHOW VARIABLES LIKE 'have_openssl';
```

Expected output when SSL is active:

```text
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| have_ssl      | YES   |
| have_openssl  | YES   |
+---------------+-------+
```

If the value is `DISABLED` or `NO`, MySQL was not built with SSL support or the certificates are missing.

## Checking the Current Session's SSL Status

Once connected, run this to check if your specific session is encrypted:

```sql
SHOW SESSION STATUS LIKE 'Ssl_cipher';
```

If you are connected over SSL, you will see a cipher name like:

```text
+---------------+-----------------------------+
| Variable_name | Value                       |
+---------------+-----------------------------+
| Ssl_cipher    | TLS_AES_256_GCM_SHA384      |
+---------------+-----------------------------+
```

An empty `Ssl_cipher` value means the connection is NOT encrypted.

## Checking All SSL-Related Status Variables

```sql
SHOW SESSION STATUS LIKE 'Ssl%';
```

Key variables to review:

```text
Ssl_cipher          - Cipher suite in use
Ssl_cipher_list     - Available ciphers
Ssl_version         - TLS version (e.g., TLSv1.3)
Ssl_server_not_after  - Certificate expiration date
Ssl_server_not_before - Certificate start date
Ssl_verify_mode     - Peer verification mode
```

## Using the STATUS Command

The `\s` shortcut in the MySQL CLI also shows connection SSL info:

```sql
\s
```

Look for a line similar to:

```text
SSL:    Cipher in use is TLS_AES_256_GCM_SHA384
```

If SSL is not active, this line reads `SSL: Not in use`.

## Verifying from the Command Line

You can check SSL from the shell before logging in:

```bash
mysql -u root -p \
  --ssl-ca=/var/lib/mysql/ca-cert.pem \
  -e "SHOW SESSION STATUS LIKE 'Ssl_cipher';"
```

## Checking All Active Connections from the Server

To audit which currently connected clients are using SSL:

```sql
SELECT
  p.id,
  p.user,
  p.host,
  p.command,
  s.variable_value AS ssl_cipher
FROM information_schema.processlist p
LEFT JOIN performance_schema.threads t
  ON t.processlist_id = p.id
LEFT JOIN performance_schema.status_by_thread s
  ON s.thread_id = t.thread_id
  AND s.variable_name = 'Ssl_cipher';
```

## Verifying TLS Version

```sql
SHOW SESSION STATUS LIKE 'Ssl_version';
```

MySQL 8.0 defaults to TLSv1.2 and TLSv1.3. Older TLS versions can be disabled with:

```text
[mysqld]
tls_version=TLSv1.2,TLSv1.3
```

## Summary

Verifying SSL in MySQL involves checking both server-level variables (`have_ssl`) and session-level status (`Ssl_cipher`). An empty cipher indicates an unencrypted connection. Use `SHOW SESSION STATUS LIKE 'Ssl%'` or the `\s` shortcut to confirm SSL is actively protecting your connection, and audit active sessions via `performance_schema` when needed.
