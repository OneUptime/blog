# ClickHouse Security Hardening Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Hardening, Checklist, TLS

Description: A security hardening checklist for ClickHouse covering authentication, network security, TLS configuration, access control, and audit logging.

---

ClickHouse deployments need explicit security configuration - the defaults are permissive for development convenience but not suitable for production. This checklist covers all critical security controls.

## Authentication

```text
[ ] Default user password changed from empty string
[ ] Dedicated service accounts created (avoid using 'default' user in apps)
[ ] Passwords stored in users.d/ files, not inline in users.xml
[ ] SHA256 password hashing used (not plaintext)
```

```xml
<!-- /etc/clickhouse-server/users.d/app_user.xml -->
<clickhouse>
  <users>
    <app_user>
      <password_sha256_hex>hash_here</password_sha256_hex>
      <networks>
        <ip>10.0.0.0/8</ip>
      </networks>
      <profile>readonly_profile</profile>
      <quota>default</quota>
    </app_user>
  </users>
</clickhouse>
```

## Network Security

```text
[ ] Listener bound to internal interface only (not 0.0.0.0) in production
[ ] Firewall rules allow only trusted CIDR blocks to port 8123/9000
[ ] HTTP interface (port 8123) disabled if not needed
[ ] Inter-node replication traffic on isolated network segment
```

```xml
<!-- Restrict to internal network -->
<listen_host>10.0.1.5</listen_host>
```

## TLS Configuration

```text
[ ] TLS certificate installed (not self-signed in production)
[ ] HTTPS port 8443 enabled
[ ] Native TLS port 9440 enabled
[ ] TLS 1.2 minimum enforced
[ ] Weak cipher suites disabled
```

```xml
<openSSL>
  <server>
    <certificateFile>/etc/ssl/clickhouse/server.crt</certificateFile>
    <privateKeyFile>/etc/ssl/clickhouse/server.key</privateKeyFile>
    <loadDefaultCAFile>true</loadDefaultCAFile>
    <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
    <preferServerCiphers>true</preferServerCiphers>
  </server>
</openSSL>
```

## Access Control

```text
[ ] Role-based access control (RBAC) enabled
[ ] Read-only roles created for dashboard users
[ ] Write roles restricted to specific tables/databases
[ ] Row-level policies configured for multi-tenant data
[ ] Interserver HTTP secret set for replica communication
```

```sql
-- Create a read-only analytics role
CREATE ROLE analytics_reader;
GRANT SELECT ON analytics.* TO analytics_reader;
GRANT analytics_reader TO grafana_user;
```

## Audit Logging

```text
[ ] Query log enabled (system.query_log)
[ ] Query log retention set to 30+ days
[ ] Part log and session log enabled
[ ] Log forwarding to SIEM configured
```

```sql
-- Review recent queries from a specific user
SELECT event_time, user, query, read_rows
FROM system.query_log
WHERE user = 'app_user'
  AND type = 'QueryStart'
ORDER BY event_time DESC
LIMIT 50;
```

## Data Encryption

```text
[ ] Encryption at rest configured for sensitive tables (AES_128_CTR or AES_256_CTR)
[ ] Encrypted disk defined in storage configuration
[ ] Encryption keys stored in external key management service
```

```sql
-- Create table on encrypted disk
CREATE TABLE sensitive_data (
    user_id UInt32,
    pii_field String
) ENGINE = MergeTree()
ORDER BY user_id
SETTINGS storage_policy = 'encrypted_policy';
```

## Summary

Securing ClickHouse requires addressing authentication, network access, TLS, role-based access control, and audit logging as a complete package. No single control is sufficient alone. Review this checklist before every new deployment and after every major version upgrade to ensure security settings remain in place.
