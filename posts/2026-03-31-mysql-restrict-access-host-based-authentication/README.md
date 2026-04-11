# How to Restrict MySQL Access with Host-Based Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Authentication, Security, Access Control, User Management

Description: Learn how to restrict MySQL database access by configuring host-based authentication rules for users to limit connections by IP or hostname.

---

## What Is Host-Based Authentication in MySQL?

MySQL's user account system ties each account to both a username and a host identifier. The full account identity is `'username'@'host'`, meaning two accounts with the same username but different hosts are entirely separate identities with independent privileges. This design lets you enforce which machines are allowed to connect as a given user, a powerful baseline for access control.

Host values can be:
- A specific IP address: `192.168.1.10`
- A hostname: `app-server.example.com`
- A wildcard: `%` (any host) or `192.168.1.%` (subnet)
- `localhost` (local connections via Unix socket or TCP loopback)

## Creating Host-Restricted User Accounts

To create a user that can only connect from a specific IP address:

```sql
CREATE USER 'appuser'@'192.168.1.50' IDENTIFIED BY 'StrongPassword!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'appuser'@'192.168.1.50';
```

To allow a subnet:

```sql
CREATE USER 'readonly'@'10.0.1.%' IDENTIFIED BY 'ReadonlyPass!';
GRANT SELECT ON reporting.* TO 'readonly'@'10.0.1.%';
```

To restrict the root account to localhost only (best practice):

```sql
DROP USER IF EXISTS 'root'@'%';
```

## Viewing Existing Host Restrictions

```sql
SELECT User, Host, plugin, authentication_string
FROM mysql.user
ORDER BY User, Host;
```

To see which accounts have open wildcard access:

```sql
SELECT User, Host FROM mysql.user WHERE Host = '%';
```

## Removing Wildcard Access

If an account was created with `%`, you can tighten it by creating a host-specific version and removing the wildcard:

```sql
CREATE USER 'appuser'@'10.0.0.5' IDENTIFIED BY 'StrongPassword!';
GRANT SELECT, INSERT ON myapp.* TO 'appuser'@'10.0.0.5';
DROP USER 'appuser'@'%';
```

## Using Hostname Instead of IP

MySQL can resolve hostnames, but this requires `skip-name-resolve` to be disabled. In `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# Comment out or remove this line to allow hostname resolution
# skip-name-resolve
```

Then create user by hostname:

```sql
CREATE USER 'deploy'@'deploy.internal.example.com' IDENTIFIED BY 'DeployPass!';
```

Note: IP-based restrictions are faster and more reliable than hostname-based ones because they avoid DNS lookups on every connection.

## Testing Your Restrictions

From an allowed host:

```bash
mysql -u appuser -p -h 192.168.1.50 myapp
```

From a disallowed host, MySQL returns:

```text
ERROR 1130 (HY000): Host '10.0.0.99' is not allowed to connect to this MySQL server
```

## Combining with SSL Requirements

For extra security, require SSL from a specific host:

```sql
ALTER USER 'appuser'@'192.168.1.50' REQUIRE SSL;
```

Or require a specific cipher:

```sql
ALTER USER 'appuser'@'192.168.1.50' REQUIRE CIPHER 'DHE-RSA-AES256-SHA';
```

## Summary

Host-based authentication in MySQL is a simple but effective layer of defense. By tying user accounts to specific IP addresses or subnets rather than using `%`, you prevent unauthorized machines from even attempting a password-based login. Always audit accounts with wildcard hosts, restrict root to localhost by dropping remote root accounts, and combine host restrictions with SSL requirements for production environments.
