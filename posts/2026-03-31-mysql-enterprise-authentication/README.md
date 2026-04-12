# How to Use MySQL Enterprise Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Enterprise, Authentication, Security

Description: Learn how MySQL Enterprise Authentication plugins work, including PAM, LDAP, and Kerberos, to integrate MySQL with your organization's identity systems.

---

## What Is MySQL Enterprise Authentication?

MySQL Enterprise Authentication provides a suite of authentication plugins that allow MySQL to delegate user identity verification to external systems instead of storing passwords in the MySQL user table. MySQL Enterprise Edition ships with plugins for PAM (Pluggable Authentication Modules), LDAP, and Kerberos, enabling seamless SSO and centralized identity management.

## Available Enterprise Authentication Plugins

```text
authentication_pam         - Authenticates via Linux PAM
authentication_ldap_simple - LDAP simple bind (username/password)
authentication_ldap_sasl   - LDAP with SASL (supports Kerberos via GSSAPI)
authentication_kerberos    - Native Kerberos/GSSAPI authentication
```

## Installing a Plugin

```sql
-- Install PAM authentication plugin
INSTALL PLUGIN authentication_pam SONAME 'authentication_pam.so';

-- Install LDAP simple bind plugin
INSTALL PLUGIN authentication_ldap_simple SONAME 'authentication_ldap_simple.so';

-- Verify installed authentication plugins
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_TYPE = 'AUTHENTICATION';
```

## Configuring PAM Authentication

PAM authentication delegates credential verification to the host OS:

```sql
-- Create a MySQL user that uses PAM
CREATE USER 'dbadmin'@'%'
  IDENTIFIED WITH authentication_pam
  AS 'mysql';  -- 'mysql' is the PAM service name
```

Create the PAM service file on the server:

```bash
# /etc/pam.d/mysql
auth     required  pam_unix.so
account  required  pam_unix.so
```

Connect using PAM credentials:

```bash
mysql -u dbadmin -p --enable-cleartext-plugin
```

## Configuring LDAP Authentication

```sql
-- Set the LDAP server details (in my.cnf or dynamically)
SET GLOBAL authentication_ldap_simple_server_host = 'ldap.company.internal';
SET GLOBAL authentication_ldap_simple_server_port = 389;
SET GLOBAL authentication_ldap_simple_bind_base_dn = 'ou=users,dc=company,dc=com';
SET GLOBAL authentication_ldap_simple_group_search_attr = 'cn';

-- Create a MySQL proxy user that maps LDAP group to MySQL role
CREATE USER ''@'%'
  IDENTIFIED WITH authentication_ldap_simple;

-- Map LDAP group to MySQL privileges via proxy
CREATE USER 'mysql_dba_proxy'@'%' IDENTIFIED BY 'placeholder';
GRANT ALL ON *.* TO 'mysql_dba_proxy'@'%';

GRANT PROXY ON 'mysql_dba_proxy'@'%' TO ''@'%';
```

## Configuring Kerberos Authentication

```sql
-- Install the Kerberos plugin
INSTALL PLUGIN authentication_kerberos SONAME 'authentication_kerberos.so';

-- Set Kerberos service principal
SET GLOBAL authentication_kerberos_service_principal = 'mysql/db-host.company.internal@COMPANY.INTERNAL';

-- Create a user authenticated via Kerberos
CREATE USER 'alice'@'%'
  IDENTIFIED WITH authentication_kerberos
  BY 'COMPANY.INTERNAL';  -- Kerberos realm name
```

Clients authenticate using their Kerberos ticket:

```bash
# Obtain a Kerberos ticket first
kinit alice@COMPANY.INTERNAL

# Connect without a password (Kerberos handles it)
mysql -u alice --plugin-dir=/usr/lib/mysql/plugin
```

## Proxy User Pattern for Group Mapping

```sql
-- Create a proxy account with no privileges of its own
CREATE USER 'ldap_user'@'%'
  IDENTIFIED WITH authentication_ldap_simple
  AS '+ou=users,dc=company,dc=com';

-- Create a role account with actual privileges
CREATE USER 'read_only_role'@'%' IDENTIFIED BY 'unused';
GRANT SELECT ON mydb.* TO 'read_only_role'@'%';

-- Map external users to the role via proxy
GRANT PROXY ON 'read_only_role'@'%' TO 'ldap_user'@'%';
```

## Summary

MySQL Enterprise Authentication plugins let you integrate MySQL with PAM, LDAP, and Kerberos - eliminating the need to manage separate MySQL passwords and enabling SSO across your database fleet. Use PAM for OS-level authentication on Linux servers, LDAP for directory-based identity, and Kerberos for seamless ticket-based authentication in Active Directory environments.
