# How to Use ClickHouse LDAP Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, LDAP, Authentication, Security, Access Control

Description: Learn how to configure ClickHouse's LDAP authentication integration to authenticate database users against an LDAP or Active Directory server.

---

ClickHouse supports LDAP-based authentication natively, allowing users to log in with their corporate directory credentials. This eliminates the need to manage separate database passwords and enables centralized access control.

## Overview

ClickHouse can be configured to:
1. Authenticate users against an LDAP server
2. Map LDAP groups to ClickHouse roles
3. Create users on-demand when they first authenticate

## Configuring the LDAP Server Connection

Add the LDAP server definition to `config.xml` or a separate file in `config.d/`:

```xml
<ldap_servers>
    <corp_ldap>
        <host>ldap.corp.example.com</host>
        <port>636</port>
        <enable_tls>yes</enable_tls>
        <tls_minimum_protocol_version>tls1.2</tls_minimum_protocol_version>
        <tls_require_cert>demand</tls_require_cert>
        <tls_ca_cert_file>/etc/ssl/certs/ca-certificates.crt</tls_ca_cert_file>
        <bind_dn>uid={user_name},ou=people,dc=corp,dc=example,dc=com</bind_dn>
        <verification_cooldown>300</verification_cooldown>
    </corp_ldap>
</ldap_servers>
```

## Configuring a User for LDAP Authentication

In `users.xml` or `users.d/`:

```xml
<users>
    <analyst_user>
        <ldap>
            <server>corp_ldap</server>
        </ldap>
        <profile>analyst_profile</profile>
        <quota>analyst_quota</quota>
        <networks>
            <ip>::/0</ip>
        </networks>
    </analyst_user>
</users>
```

## LDAP Group-Based Role Mapping

Role mapping is configured in the `<user_directories>` section, not per-user. ClickHouse searches the LDAP directory for group membership and maps matching groups to ClickHouse roles:

```xml
<user_directories>
    <ldap>
        <server>corp_ldap</server>
        <role_mapping>
            <base_dn>ou=groups,dc=corp,dc=example,dc=com</base_dn>
            <scope>subtree</scope>
            <search_filter>(&amp;(objectClass=groupOfNames)(member={bind_dn}))</search_filter>
            <attribute>cn</attribute>
            <prefix>clickhouse_</prefix>
        </role_mapping>
    </ldap>
</user_directories>
```

With this configuration, an LDAP group named `clickhouse_admin_role` would map to the ClickHouse role `admin_role` (the prefix is stripped).

## Testing LDAP Authentication

```bash
clickhouse-client \
  --host localhost \
  --user john.doe \
  --password "ldap_password" \
  --query "SELECT currentUser()"
```

## Enabling the External Users Directory

For on-demand user creation (users that exist in LDAP but not yet in ClickHouse config):

```xml
<user_directories>
    <ldap>
        <server>corp_ldap</server>
        <roles>
            <analyst_role />
        </roles>
    </ldap>
</user_directories>
```

## Troubleshooting LDAP

Check connection logs:

```bash
grep -i ldap /var/log/clickhouse-server/clickhouse-server.log
```

Test LDAP bind manually:

```bash
ldapwhoami -H ldaps://ldap.corp.example.com \
  -D "uid=john.doe,ou=people,dc=corp,dc=example,dc=com" \
  -W
```

## Summary

ClickHouse's built-in LDAP authentication integration centralizes user management through your organization's directory service, reducing password sprawl and enabling group-based access control for database access.
