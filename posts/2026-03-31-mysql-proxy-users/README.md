# How to Use Proxy Users in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Proxy, Security, Authentication

Description: Learn how to configure MySQL proxy users to map one set of credentials to another account, enabling centralized privilege management and external authentication.

---

## What Are Proxy Users?

MySQL proxy users allow one account (the "proxy" account) to authenticate and then be automatically mapped to a different account (the "proxied" account) for privilege purposes. The connecting user sees the proxied account's privileges, not the proxy account's. This pattern is used for:

- External authentication (LDAP, PAM) where the external user maps to a MySQL account
- Connection pooling where all connections use a proxy account but run with different privilege sets
- Centralized privilege management

## How Proxy Authentication Works

1. Client connects using the proxy user credentials
2. MySQL authenticates the client against the proxy account's plugin
3. MySQL maps the proxy account to the proxied account
4. The session runs with the proxied account's privileges

## Creating a Proxied Account

The proxied account holds the actual privileges but typically cannot connect directly:

```sql
-- Install the mysql_no_login plugin (if not already installed)
INSTALL PLUGIN mysql_no_login SONAME 'mysql_no_login.so';

-- Create the proxied account (holds privileges)
CREATE USER 'developer_template'@'%'
  IDENTIFIED WITH mysql_no_login;

-- Grant privileges to the proxied account
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'developer_template'@'%';
```

## Creating the Proxy Account

The proxy account connects from the outside world and gets mapped to the proxied account:

```sql
-- Create the proxy account (external auth, no direct privileges)
CREATE USER 'alice'@'%'
  IDENTIFIED WITH mysql_native_password
  BY 'AlicePass!';

-- Grant proxy permission: alice -> developer_template
GRANT PROXY ON 'developer_template'@'%' TO 'alice'@'%';

-- Enable server-side proxy user mapping (required for mysql_native_password)
SET GLOBAL check_proxy_users = ON;
SET GLOBAL mysql_native_password_proxy_users = ON;
```

## Verifying Proxy Setup

```sql
SHOW GRANTS FOR 'alice'@'%';
```

Output:

```text
+-------------------------------------------------------------------+
| Grants for alice@%                                                |
+-------------------------------------------------------------------+
| GRANT USAGE ON *.* TO `alice`@`%`                                 |
| GRANT PROXY ON `developer_template`@`%` TO `alice`@`%`            |
+-------------------------------------------------------------------+
```

## Connecting as a Proxy User

```bash
mysql -u alice -p
```

Inside the session, verify the effective user:

```sql
SELECT USER(), CURRENT_USER();
```

Output:

```text
+------------------+---------------------------+
| USER()           | CURRENT_USER()            |
+------------------+---------------------------+
| alice@localhost   | developer_template@%      |
+------------------+---------------------------+
```

`USER()` shows who connected; `CURRENT_USER()` shows the effective account whose privileges apply.

## Creating a Default Proxy (Catch-All)

Map all unmatched users to a default account:

```sql
CREATE USER ''@'%' IDENTIFIED WITH mysql_native_password BY '';
GRANT PROXY ON 'read_only_template'@'%' TO ''@'%';
```

Any user without an explicit proxy mapping now falls back to `read_only_template` privileges.

## Revoking Proxy Grants

```sql
REVOKE PROXY ON 'developer_template'@'%' FROM 'alice'@'%';
```

## Proxy Users with PAM or LDAP (Enterprise)

Enterprise proxy authentication via LDAP:

```sql
CREATE USER 'ldap_user'@'%'
  IDENTIFIED WITH authentication_ldap_simple
  AS 'CN=ldap_user,OU=Users,DC=example,DC=com';

GRANT PROXY ON 'developer_template'@'%' TO 'ldap_user'@'%';
```

The LDAP credentials are validated externally; if successful, the session uses `developer_template` privileges.

## Summary

MySQL proxy users decouple authentication from authorization. The proxy account handles the client-facing authentication while the proxied account holds the privilege definitions. Use `GRANT PROXY ON proxied TO proxy` to establish the mapping, and verify with `USER()` vs `CURRENT_USER()` in the session. This pattern is especially powerful combined with external authentication plugins for LDAP or PAM integration.
