# How to Set Up LDAP Authentication in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, LDAP, Authentication, Security, Active Directory

Description: Learn how to configure LDAP authentication in ClickHouse to allow users to log in using their corporate directory credentials instead of local passwords.

---

## What Is LDAP Authentication in ClickHouse

ClickHouse supports authenticating users against an LDAP directory (such as Active Directory or OpenLDAP). Instead of storing passwords in ClickHouse's `users.xml`, user credentials are validated against the LDAP server at login time.

## Step 1 - Configure the LDAP Server in config.xml

Define an LDAP server connection in `config.xml`:

```xml
<ldap_servers>
    <corporate_ldap>
        <host>ldap.company.com</host>
        <port>389</port>
        <bind_dn>uid={user_name},ou=people,dc=company,dc=com</bind_dn>
        <verification_cooldown>300</verification_cooldown>
        <enable_tls>no</enable_tls>
    </corporate_ldap>
</ldap_servers>
```

For LDAPS (LDAP over TLS):

```xml
<ldap_servers>
    <corporate_ldap>
        <host>ldap.company.com</host>
        <port>636</port>
        <bind_dn>uid={user_name},ou=people,dc=company,dc=com</bind_dn>
        <enable_tls>yes</enable_tls>
        <tls_require_cert>demand</tls_require_cert>
        <tls_ca_cert_file>/etc/ssl/certs/ca-bundle.crt</tls_ca_cert_file>
        <tls_minimum_protocol_version>tls1.2</tls_minimum_protocol_version>
        <verification_cooldown>300</verification_cooldown>
    </corporate_ldap>
</ldap_servers>
```

## Step 2 - Configure a User to Use LDAP Authentication

In `users.xml`, define a user with LDAP authentication:

```xml
<users>
    <john_doe>
        <ldap>
            <server>corporate_ldap</server>
        </ldap>
        <networks>
            <ip>::/0</ip>
        </networks>
        <profile>default</profile>
        <quota>default</quota>
    </john_doe>
</users>
```

## Step 3 - Set Up LDAP External User Directories (Auto-User Creation)

To avoid manually adding every LDAP user to `users.xml`, configure an LDAP user directory:

```xml
<user_directories>
    <users_xml>
        <path>users.xml</path>
    </users_xml>
    <ldap>
        <server>corporate_ldap</server>
        <roles>
            <my_ldap_role/>
        </roles>
        <role_mapping>
            <base_dn>ou=groups,dc=company,dc=com</base_dn>
            <attribute>cn</attribute>
            <scope>subtree</scope>
            <search_filter>(&amp;(objectClass=groupOfNames)(member={user_dn}))</search_filter>
            <prefix>clickhouse_</prefix>
        </role_mapping>
    </ldap>
</user_directories>
```

Users that authenticate via LDAP are assigned roles based on their LDAP group membership.

## Step 4 - Create Matching ClickHouse Roles

Create roles in ClickHouse that match the LDAP group names (with the prefix):

```sql
-- If LDAP group is "clickhouse_analysts"
CREATE ROLE analysts;

GRANT SELECT ON default.* TO analysts;
GRANT SELECT ON system.query_log TO analysts;
```

## Testing LDAP Authentication

```bash
# Test with the command-line client
clickhouse-client \
    --host localhost \
    --user john_doe \
    --password 'ldap_password_here' \
    --query "SELECT currentUser()"
```

## Bind DN Formats

Different LDAP servers use different bind DN formats:

```xml
<!-- OpenLDAP - uid-based -->
<bind_dn>uid={user_name},ou=people,dc=company,dc=com</bind_dn>

<!-- Active Directory - userPrincipalName format -->
<bind_dn>{user_name}@company.com</bind_dn>

<!-- Active Directory - sAMAccountName format -->
<bind_dn>COMPANY\{user_name}</bind_dn>
```

## Configuring Search Bind for AD

For Active Directory where a service account is needed to search:

```xml
<ldap_servers>
    <ad_server>
        <host>ad.company.com</host>
        <port>389</port>
        <bind_dn>{user_name}@company.com</bind_dn>
        <user_dn_detection>
            <base_dn>dc=company,dc=com</base_dn>
            <search_filter>(&amp;(objectClass=user)(sAMAccountName={user_name}))</search_filter>
        </user_dn_detection>
        <enable_tls>no</enable_tls>
        <verification_cooldown>60</verification_cooldown>
    </ad_server>
</ldap_servers>
```

## Monitoring LDAP Authentication

```sql
-- Check successful LDAP logins
SELECT
    event_time,
    user,
    client_hostname,
    interface
FROM system.session_log
WHERE type = 'LoginSuccess'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;

-- Check failed logins
SELECT
    event_time,
    user,
    client_hostname,
    failure_reason
FROM system.session_log
WHERE type = 'LoginFailure'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

ClickHouse LDAP authentication integrates with corporate directories by defining LDAP server connection details in `config.xml` and assigning individual users or external user directories to use the LDAP server for credential validation. Use role mapping via LDAP group search to automatically assign ClickHouse permissions based on group membership, eliminating the need to manage users in `users.xml` manually.
