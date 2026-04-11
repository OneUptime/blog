# How to Remove the Test Database in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Hardening, Database, Best Practice

Description: Learn how to remove the default MySQL test database and revoke public access to it as part of standard post-installation security hardening.

---

MySQL installations often include a `test` database by default. This database is accessible to all users, including anonymous ones, and serves no production purpose. Leaving it in place is a security risk - it can be used for reconnaissance, testing exploits, or simply wasting server resources. Removing it is one of the first hardening steps after a new MySQL installation.

## Why the Test Database Is a Risk

The `test` database in a default MySQL installation has open permissions. Any user - including anonymous users - may have access to create tables, insert data, and run queries against it. This can be used for:

- Confirming that database server is reachable
- Testing injection techniques
- Consuming disk space with large inserts
- Running heavy queries to cause denial of service

## Checking for the Test Database

```sql
SHOW DATABASES;
```

If you see `test` in the output, it exists and should be removed.

```sql
-- Check permissions on the test database
SELECT user, host, db, Select_priv, Insert_priv, Create_priv
FROM mysql.db
WHERE db = 'test' OR db = 'test\_%';
```

## Removing the Test Database

```sql
DROP DATABASE IF EXISTS test;
```

## Removing Test Database Access

After dropping the database, remove the default grant entries that allow any user to access databases named `test` or starting with `test_`:

```sql
DELETE FROM mysql.db WHERE Db='test' OR Db='test\_%';
FLUSH PRIVILEGES;
```

If you also have custom `test.*` grants on named accounts, revoke them with `REVOKE`.

## Using mysql_secure_installation

The `mysql_secure_installation` utility handles this interactively:

```bash
mysql_secure_installation
```

Answer `Y` to the prompt:

```text
Remove test database and access to it? [Y/n] Y
```

The script drops the database and removes grant entries automatically.

## Automating Removal in Deployment Scripts

For automated server provisioning:

```bash
#!/bin/bash
MYSQL_ROOT_PASS="${1}"

mysql -u root -p"${MYSQL_ROOT_PASS}" <<'EOF'
DROP DATABASE IF EXISTS test;

DELETE FROM mysql.db WHERE Db='test' OR Db='test\_%';
FLUSH PRIVILEGES;

DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'::1';

DROP USER IF EXISTS 'root'@'%';
EOF

echo "MySQL hardening complete."
```

## Verifying Removal

```sql
-- Confirm test database is gone
SHOW DATABASES LIKE 'test';

-- Confirm no permissions remain
SELECT db FROM mysql.db WHERE db LIKE 'test%';
```

Both queries should return empty result sets.

## Other Databases to Review

While removing `test`, also audit for any other unnecessary databases:

```sql
SHOW DATABASES;
```

Standard system databases that should remain: `information_schema`, `mysql`, `performance_schema`, `sys`. Any others should be verified as intentional.

## Summary

Removing the `test` database is a fundamental MySQL security hardening step. Use `DROP DATABASE IF EXISTS test` to remove it, then handle any account cleanup with `DROP USER` and `REVOKE`. Automate this in provisioning scripts so no newly installed MySQL server is left with the default insecure configuration.
