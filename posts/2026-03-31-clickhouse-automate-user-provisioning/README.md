# How to Automate ClickHouse User Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, User Provisioning, Automation, Security, Role-Based Access Control

Description: Learn how to automate ClickHouse user provisioning with scripts and SQL templates to manage users consistently across environments.

---

## Why Automate User Provisioning

Manually creating ClickHouse users is error-prone and hard to audit. As your team grows, you need a repeatable process that enforces the principle of least privilege and keeps access in sync with your identity provider.

## User and Role Model in ClickHouse

ClickHouse uses a role-based access control (RBAC) model. You create roles with specific privileges and assign them to users.

```sql
CREATE ROLE IF NOT EXISTS analyst;
GRANT SELECT ON analytics.* TO analyst;

CREATE ROLE IF NOT EXISTS etl_writer;
GRANT INSERT ON raw.* TO etl_writer;
```

## Provisioning Users with SQL Scripts

Store user definitions in version-controlled SQL files. A typical provisioning script looks like this:

```sql
CREATE USER IF NOT EXISTS alice
    IDENTIFIED WITH sha256_password BY 'changeme'
    HOST IP '10.0.0.0/8';

GRANT analyst TO alice;

SET DEFAULT ROLE analyst TO alice;
```

Run these scripts as part of your CI/CD pipeline or infrastructure-as-code workflow.

## Automating with a Shell Script

Wrap the SQL in a shell script for batch provisioning from a CSV file:

```bash
#!/bin/bash
# users.csv: username,role,allowed_ip
while IFS=',' read -r username role ip; do
  clickhouse-client --query "
    CREATE USER IF NOT EXISTS ${username}
      IDENTIFIED WITH sha256_password BY 'TempPass123'
      HOST IP '${ip}';
    GRANT ${role} TO ${username};
    SET DEFAULT ROLE ${role} TO ${username};
  "
done < users.csv
```

## Integrating with LDAP or SSO

For large teams, sync users from LDAP instead of managing credentials locally:

```xml
<ldap_servers>
  <corp_ldap>
    <host>ldap.corp.example.com</host>
    <port>636</port>
    <bind_dn>uid={user_name},ou=people,dc=corp,dc=example,dc=com</bind_dn>
    <user_dn_detection>
      <base_dn>ou=people,dc=corp,dc=example,dc=com</base_dn>
      <search_filter>(&amp;(objectClass=person)(uid={user_name}))</search_filter>
    </user_dn_detection>
    <enable_tls>yes</enable_tls>
  </corp_ldap>
</ldap_servers>
```

ClickHouse binds to LDAP as the end user during each login — `bind_dn` is a template where `{user_name}` is substituted with the login name, and the user's own password is used for the bind. There is no service-account credential in this config.

Then reference the LDAP server in user config so ClickHouse delegates authentication to LDAP.

## Auditing Provisioned Users

Review current users and their roles at any time:

```sql
SELECT name, auth_type, host_ip, default_roles_all
FROM system.users
ORDER BY name;

SELECT user_name, granted_role_name
FROM system.role_grants
ORDER BY user_name;
```

## Enforcing Access Reviews

Schedule a weekly query that exports the user-role matrix to a monitoring system like OneUptime, alerting you when users hold roles they should not:

```sql
SELECT u.name AS user, r.granted_role_name AS role
FROM system.users u
JOIN system.role_grants r ON r.user_name = u.name
WHERE r.granted_role_name IN ('admin', 'etl_writer')
ORDER BY user;
```

## Summary

Automating ClickHouse user provisioning through SQL templates, shell scripts, and LDAP integration keeps access management consistent, auditable, and scalable as your organization grows.
