# How to Set Up ClickHouse Access Control with LDAP Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, LDAP, Access Control, Security, Role, Authentication

Description: Learn how to map LDAP directory groups to ClickHouse roles for centralized access control using your organization's existing directory service.

---

Mapping LDAP groups to ClickHouse roles lets you manage access centrally in your directory service. When a user's LDAP group membership changes, their ClickHouse permissions update automatically without manual role reassignment.

## Prerequisites

- LDAP server configured (Active Directory or OpenLDAP)
- ClickHouse LDAP server connection defined in `config.xml`
- SQL-driven access control enabled

## Configuring LDAP Server in config.xml

Define your LDAP server connection:

```text
<ldap_servers>
  <corp_ldap>
    <host>ldap.example.com</host>
    <port>636</port>
    <bind_dn>CN=svc-clickhouse,OU=ServiceAccounts,DC=example,DC=com</bind_dn>
    <bind_password>ServiceAccountPass!</bind_password>
    <user_dn_detection>
      <base_dn>OU=Users,DC=example,DC=com</base_dn>
      <search_filter>(&amp;(objectClass=user)(sAMAccountName={user_name}))</search_filter>
    </user_dn_detection>
    <enable_tls>yes</enable_tls>
    <tls_ca_cert_file>/etc/ssl/certs/ca-certificates.crt</tls_ca_cert_file>
  </corp_ldap>
</ldap_servers>
```

## Creating ClickHouse Roles for LDAP Groups

Create roles that will map to LDAP groups. Because the mapping will strip a `clickhouse_` prefix from LDAP group names, the ClickHouse role names omit that prefix:

```sql
-- Maps to CN=clickhouse_analysts,OU=Groups,DC=example,DC=com
CREATE ROLE analysts;
GRANT SELECT ON reporting_db.* TO analysts;

-- Maps to CN=clickhouse_engineers,OU=Groups,DC=example,DC=com
CREATE ROLE engineers;
GRANT SELECT, INSERT ON staging_db.* TO engineers;
GRANT SELECT, INSERT ON raw_db.* TO engineers;

-- Maps to CN=clickhouse_admins,OU=Groups,DC=example,DC=com
CREATE ROLE admins;
GRANT ALL ON *.* TO admins;
```

## Configuring LDAP-to-Role Mapping via user_directories

Role mapping is configured as an external user directory in `config.xml` under `<user_directories>`, not in `users.xml`. Each group-to-role rule is a `<role_mapping>` element:

```text
<user_directories>
  <ldap>
    <server>corp_ldap</server>
    <role_mapping>
      <base_dn>OU=Groups,DC=example,DC=com</base_dn>
      <scope>subtree</scope>
      <search_filter>(&amp;(objectClass=group)(member={bind_dn}))</search_filter>
      <attribute>cn</attribute>
      <prefix>clickhouse_</prefix>
    </role_mapping>
  </ldap>
</user_directories>
```

The `prefix` field strips `clickhouse_` from the returned LDAP group name to match the ClickHouse role name. For example, group `clickhouse_analysts` maps to role `analysts`.

## Testing Group Mapping

Connect as an LDAP user and verify role assignment:

```sql
-- After logging in as an LDAP user
SELECT currentUser();
-- Returns: jdoe

SHOW CURRENT ROLES;
-- Returns the roles mapped from their LDAP groups
```

Check the system tables to verify:

```sql
SELECT user_name, granted_role_name, with_admin_option
FROM system.role_grants
WHERE user_name = 'jdoe';
```

## Refreshing Group Membership

LDAP authentication and group membership are re-evaluated on each request unless caching is enabled. To reduce LDAP load, use `verification_cooldown` on the server definition; it is the number of seconds for which a successful bind (and the associated role mapping result) is reused without contacting the LDAP server:

```text
<ldap_servers>
  <corp_ldap>
    ...
    <verification_cooldown>300</verification_cooldown>
  </corp_ldap>
</ldap_servers>
```

Set `verification_cooldown` to `0` to force a fresh LDAP lookup on every request.

## Handling Multiple Group Sources

You can define multiple `<role_mapping>` blocks within the same `<ldap>` directory entry to pull roles from different base DNs:

```text
<user_directories>
  <ldap>
    <server>corp_ldap</server>
    <role_mapping>
      <base_dn>OU=ClickHouseGroups,DC=example,DC=com</base_dn>
      <search_filter>(&amp;(objectClass=group)(member={bind_dn}))</search_filter>
      <attribute>cn</attribute>
    </role_mapping>
    <role_mapping>
      <base_dn>OU=SharedGroups,DC=example,DC=com</base_dn>
      <search_filter>(&amp;(objectClass=group)(member={bind_dn}))</search_filter>
      <attribute>cn</attribute>
      <prefix>shared_</prefix>
    </role_mapping>
  </ldap>
</user_directories>
```

## Best Practices

- Use a dedicated service account for ClickHouse LDAP bind with minimal LDAP permissions
- Use group name prefixes to avoid role name collisions
- Pre-create all expected roles in ClickHouse before LDAP users log in
- Monitor authentication errors in `system.query_log` for LDAP failures

```sql
SELECT user, exception, event_time
FROM system.query_log
WHERE exception LIKE '%LDAP%'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

LDAP group mapping in ClickHouse enables centralized access governance. Configure your LDAP server in `config.xml`, create matching ClickHouse roles, and define group-to-role mapping rules. Changes in LDAP group membership automatically propagate to ClickHouse permissions at the next user login.
