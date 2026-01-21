# How to Integrate Elasticsearch with LDAP/AD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, LDAP, Active Directory, Authentication, Enterprise Security, SSO

Description: A comprehensive guide to integrating Elasticsearch with LDAP and Active Directory for enterprise authentication, including configuration, role mapping, and troubleshooting.

---

Integrating Elasticsearch with LDAP (Lightweight Directory Access Protocol) or Active Directory (AD) enables centralized authentication and authorization using your existing enterprise identity infrastructure. This guide covers complete LDAP/AD integration configuration.

## Understanding LDAP Integration

LDAP integration provides:

- **Centralized authentication** - Users authenticate with existing credentials
- **Group-based authorization** - Map LDAP groups to Elasticsearch roles
- **Single sign-on preparation** - Foundation for SSO implementations
- **Simplified user management** - No separate Elasticsearch user database

## Prerequisites

Before configuring LDAP integration:

1. Elasticsearch with X-Pack security enabled
2. Network connectivity to LDAP/AD server
3. LDAP bind credentials (service account)
4. LDAP directory structure information

## Basic LDAP Realm Configuration

### Configure elasticsearch.yml

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
  unmapped_groups_as_roles: false
```

### Add Bind Password to Keystore

```bash
/usr/share/elasticsearch/bin/elasticsearch-keystore add \
  xpack.security.authc.realms.ldap.ldap1.secure_bind_password
```

### Restart Elasticsearch

```bash
systemctl restart elasticsearch
```

## Active Directory Configuration

### Basic AD Configuration

```yaml
xpack.security.authc.realms.active_directory.ad1:
  order: 1
  url: "ldap://ad.example.com:389"
  domain_name: "example.com"
  bind_dn: "CN=elasticsearch,OU=Services,DC=example,DC=com"
  unmapped_groups_as_roles: false
```

### AD with User Search

```yaml
xpack.security.authc.realms.active_directory.ad1:
  order: 1
  url: "ldap://ad.example.com:389"
  domain_name: "example.com"
  bind_dn: "CN=elasticsearch,OU=Services,DC=example,DC=com"
  user_search:
    base_dn: "OU=Users,DC=example,DC=com"
    scope: sub_tree
    filter: "(&(objectClass=user)(sAMAccountName={0}))"
  group_search:
    base_dn: "OU=Groups,DC=example,DC=com"
    scope: sub_tree
  follow_referrals: true
```

## Secure LDAP with TLS/SSL

### LDAPS Configuration

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldaps://ldap.example.com:636"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
  ssl:
    verification_mode: certificate
    certificate_authorities: ["/etc/elasticsearch/certs/ldap-ca.crt"]
```

### StartTLS Configuration

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  ssl:
    verification_mode: certificate
    certificate_authorities: ["/etc/elasticsearch/certs/ldap-ca.crt"]
```

### Trust Store Configuration

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldaps://ldap.example.com:636"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  ssl:
    truststore:
      path: "/etc/elasticsearch/certs/ldap-truststore.jks"
      password: "${LDAP_TRUSTSTORE_PASSWORD}"
```

## User Search Configuration

### User DN Template Mode

For predictable DN structures:

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  user_dn_templates:
    - "uid={0},ou=users,dc=example,dc=com"
    - "uid={0},ou=admins,dc=example,dc=com"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
```

### User Search Mode

For flexible user location:

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "dc=example,dc=com"
    scope: sub_tree
    filter: "(|(uid={0})(mail={0}))"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
```

### User Attribute Mapping

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
    attribute:
      uid: "sAMAccountName"
  metadata:
    - cn
    - mail
    - department
```

## Group Search Configuration

### Basic Group Search

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
    scope: sub_tree
    filter: "(member={0})"
```

### User Attribute for Groups

When group membership is stored on user objects:

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  user_group_attribute: "memberOf"
```

### AD Nested Groups

```yaml
xpack.security.authc.realms.active_directory.ad1:
  order: 1
  url: "ldap://ad.example.com:389"
  domain_name: "example.com"
  bind_dn: "CN=elasticsearch,OU=Services,DC=example,DC=com"
  group_search:
    base_dn: "DC=example,DC=com"
    scope: sub_tree
    # This filter resolves nested group membership
    filter: "(member:1.2.840.113556.1.4.1941:={0})"
```

## Role Mapping

### API-Based Role Mapping

```bash
# Map LDAP group to Elasticsearch role
curl -u elastic:password -X PUT "localhost:9200/_security/role_mapping/ldap_admins" -H 'Content-Type: application/json' -d'
{
  "roles": ["superuser"],
  "enabled": true,
  "rules": {
    "field": {
      "groups": "cn=elasticsearch-admins,ou=groups,dc=example,dc=com"
    }
  },
  "metadata": {
    "description": "Maps LDAP elasticsearch-admins to superuser"
  }
}'

# Map developers group
curl -u elastic:password -X PUT "localhost:9200/_security/role_mapping/ldap_developers" -H 'Content-Type: application/json' -d'
{
  "roles": ["developer_role"],
  "enabled": true,
  "rules": {
    "field": {
      "groups": "cn=developers,ou=groups,dc=example,dc=com"
    }
  }
}'

# Map by realm and username
curl -u elastic:password -X PUT "localhost:9200/_security/role_mapping/ldap_readonly" -H 'Content-Type: application/json' -d'
{
  "roles": ["read_only"],
  "enabled": true,
  "rules": {
    "all": [
      {"field": {"realm.name": "ldap1"}},
      {"field": {"groups": "cn=readonly-users,ou=groups,dc=example,dc=com"}}
    ]
  }
}'
```

### Complex Role Mapping Rules

```bash
# Multiple conditions
curl -u elastic:password -X PUT "localhost:9200/_security/role_mapping/complex_mapping" -H 'Content-Type: application/json' -d'
{
  "roles": ["monitoring_user", "logs_reader"],
  "enabled": true,
  "rules": {
    "any": [
      {
        "all": [
          {"field": {"realm.name": "ldap1"}},
          {"field": {"groups": "cn=ops-team,ou=groups,dc=example,dc=com"}}
        ]
      },
      {
        "all": [
          {"field": {"realm.name": "ad1"}},
          {"field": {"groups": "CN=Operations,OU=Groups,DC=example,DC=com"}}
        ]
      }
    ]
  }
}'
```

### File-Based Role Mapping

Create `/etc/elasticsearch/role_mapping.yml`:

```yaml
superuser:
  - "cn=elasticsearch-admins,ou=groups,dc=example,dc=com"

kibana_admin:
  - "cn=kibana-admins,ou=groups,dc=example,dc=com"

monitoring_user:
  - "cn=developers,ou=groups,dc=example,dc=com"
  - "cn=ops-team,ou=groups,dc=example,dc=com"

read_only:
  - "cn=readonly-users,ou=groups,dc=example,dc=com"
```

Configure in elasticsearch.yml:

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldap://ldap.example.com:389"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
  files:
    role_mapping: "role_mapping.yml"
```

## Multiple LDAP Realms

### Primary and Fallback Realms

```yaml
# Primary LDAP realm
xpack.security.authc.realms.ldap.ldap_primary:
  order: 1
  url: "ldaps://ldap-primary.example.com:636"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
  ssl:
    certificate_authorities: ["/etc/elasticsearch/certs/ldap-ca.crt"]

# Fallback LDAP realm
xpack.security.authc.realms.ldap.ldap_secondary:
  order: 2
  url: "ldaps://ldap-secondary.example.com:636"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
  ssl:
    certificate_authorities: ["/etc/elasticsearch/certs/ldap-ca.crt"]
```

### LDAP and Native Realm Together

```yaml
# Native realm for service accounts
xpack.security.authc.realms.native.native1:
  order: 0

# LDAP realm for human users
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldaps://ldap.example.com:636"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
```

## Load Balancing and Failover

### Multiple LDAP URLs

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url:
    - "ldaps://ldap1.example.com:636"
    - "ldaps://ldap2.example.com:636"
    - "ldaps://ldap3.example.com:636"
  load_balance:
    type: "failover"  # or "round_robin" or "dns_failover"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
```

### Connection Pooling

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldaps://ldap.example.com:636"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(uid={0})"
  connection_pool:
    size: 20
    initial_size: 5
  timeout:
    tcp_connect: "5s"
    tcp_read: "5s"
    ldap_search: "5s"
```

## Complete Configuration Example

```yaml
# elasticsearch.yml

xpack.security.enabled: true

# Transport TLS
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.keystore.path: certs/elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: certs/elastic-certificates.p12

# HTTP TLS
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: certs/http.p12

# Authentication realms
xpack.security.authc.realms:
  # Native realm for service accounts (order 0 = highest priority)
  native.native1:
    order: 0

  # Active Directory realm for human users
  active_directory.ad1:
    order: 1
    url: "ldaps://ad.example.com:636"
    domain_name: "example.com"
    bind_dn: "CN=elasticsearch,OU=Services,DC=example,DC=com"
    user_search:
      base_dn: "OU=Users,DC=example,DC=com"
      scope: sub_tree
      filter: "(&(objectClass=user)(sAMAccountName={0}))"
    group_search:
      base_dn: "OU=Groups,DC=example,DC=com"
      scope: sub_tree
    metadata:
      - cn
      - mail
      - department
    ssl:
      verification_mode: certificate
      certificate_authorities: ["/etc/elasticsearch/certs/ad-ca.crt"]
    timeout:
      tcp_connect: "5s"
      tcp_read: "5s"
      ldap_search: "5s"
    connection_pool:
      size: 20
      initial_size: 5
    follow_referrals: true
    unmapped_groups_as_roles: false
```

## Testing LDAP Authentication

### Test User Authentication

```bash
# Authenticate with LDAP credentials
curl -u ldap_user:ldap_password -X GET "localhost:9200/_security/_authenticate?pretty"
```

Expected response:

```json
{
  "username": "ldap_user",
  "roles": ["developer_role", "monitoring_user"],
  "full_name": null,
  "email": null,
  "metadata": {
    "ldap_dn": "uid=ldap_user,ou=users,dc=example,dc=com",
    "ldap_groups": [
      "cn=developers,ou=groups,dc=example,dc=com"
    ]
  },
  "enabled": true,
  "authentication_realm": {
    "name": "ldap1",
    "type": "ldap"
  },
  "lookup_realm": {
    "name": "ldap1",
    "type": "ldap"
  }
}
```

### Verify Group Membership

```bash
curl -u ldap_user:ldap_password -X POST "localhost:9200/_security/user/_has_privileges" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "index": [
    {
      "names": ["logs-*"],
      "privileges": ["read"]
    }
  ]
}'
```

## Troubleshooting

### Enable Debug Logging

Add to `log4j2.properties`:

```properties
logger.ldap.name = org.elasticsearch.xpack.security.authc.ldap
logger.ldap.level = debug
```

Or via API:

```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "logger.org.elasticsearch.xpack.security.authc.ldap": "DEBUG"
  }
}'
```

### Common Issues

#### Connection Refused

```bash
# Test LDAP connectivity
ldapsearch -H ldap://ldap.example.com:389 -x -D "cn=elasticsearch,ou=services,dc=example,dc=com" -W -b "dc=example,dc=com" "(uid=testuser)"

# Check firewall
nc -zv ldap.example.com 389
nc -zv ldap.example.com 636
```

#### Certificate Issues

```bash
# Test SSL connection
openssl s_client -connect ldap.example.com:636 -CAfile /etc/elasticsearch/certs/ldap-ca.crt

# Verify certificate chain
openssl verify -CAfile ldap-ca.crt ldap-server.crt
```

#### User Not Found

```bash
# Test user search
ldapsearch -H ldap://ldap.example.com:389 \
  -D "cn=elasticsearch,ou=services,dc=example,dc=com" -W \
  -b "ou=users,dc=example,dc=com" "(uid=testuser)"
```

#### Groups Not Resolved

```bash
# Test group search
ldapsearch -H ldap://ldap.example.com:389 \
  -D "cn=elasticsearch,ou=services,dc=example,dc=com" -W \
  -b "ou=groups,dc=example,dc=com" "(member=uid=testuser,ou=users,dc=example,dc=com)"
```

### Check Role Mappings

```bash
# List all role mappings
curl -u elastic:password -X GET "localhost:9200/_security/role_mapping?pretty"

# Get specific mapping
curl -u elastic:password -X GET "localhost:9200/_security/role_mapping/ldap_admins?pretty"
```

## Best Practices

1. **Use LDAPS** - Always use TLS for LDAP connections
2. **Dedicated service account** - Use a dedicated bind DN for Elasticsearch
3. **Minimal bind permissions** - Service account only needs read access
4. **Test in staging** - Verify LDAP configuration before production
5. **Monitor authentication** - Enable audit logging for LDAP auth events
6. **Cache settings** - Tune cache for your user base size
7. **Failover configuration** - Configure multiple LDAP servers

## Summary

LDAP/AD integration enables:

1. **Centralized authentication** - Use existing enterprise credentials
2. **Group-based authorization** - Map directory groups to Elasticsearch roles
3. **Simplified management** - No separate user database to maintain
4. **Enterprise compliance** - Meet security requirements with existing infrastructure

With properly configured LDAP integration, users can authenticate to Elasticsearch using their existing enterprise credentials while administrators manage access through familiar directory group membership.
