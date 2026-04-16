# How to Harden ClickHouse Server for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Hardening, Production, Best Practice

Description: Harden your ClickHouse server for production by disabling unnecessary interfaces, enforcing TLS, configuring user permissions, and locking down network access.

---

A default ClickHouse installation prioritizes ease of use over security. For production deployments, you need to systematically harden every layer: network access, authentication, encryption, and operating system settings. This guide walks through the essential steps.

## 1. Disable the Default User

The default ClickHouse installation ships with a passwordless `default` user. Disable it immediately:

```xml
<users>
  <default>
    <password>CHANGE_ME_TO_STRONG_PASSWORD</password>
    <!-- Or disable completely and create a named admin user -->
    <access_management>0</access_management>
  </default>
</users>
```

Create a dedicated admin user instead:

```sql
CREATE USER admin IDENTIFIED WITH sha256_password BY 'StrongPassword!123'
    HOST IP '10.0.0.0/8';

GRANT ALL ON *.* TO admin WITH GRANT OPTION;
```

## 2. Enable TLS for All Connections

```xml
<openSSL>
  <server>
    <certificateFile>/etc/clickhouse-server/ssl/server.crt</certificateFile>
    <privateKeyFile>/etc/clickhouse-server/ssl/server.key</privateKeyFile>
    <caConfig>/etc/clickhouse-server/ssl/ca.crt</caConfig>
    <verificationMode>relaxed</verificationMode>
    <requireTLSv1_2>true</requireTLSv1_2>
    <cipherList>HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA</cipherList>
  </server>
</openSSL>

<!-- Disable plain HTTP, keep only HTTPS -->
<http_port remove="true"></http_port>
<https_port>8443</https_port>
<tcp_port remove="true"></tcp_port>
<tcp_port_secure>9440</tcp_port_secure>
```

## 3. Bind to Specific Interfaces

By default, ClickHouse listens on all interfaces. Restrict this:

```xml
<listen_host>10.0.1.5</listen_host>  <!-- Internal cluster IP only -->
```

## 4. Configure Firewall Rules

```bash
# Allow cluster internal traffic only
ufw allow from 10.0.0.0/8 to any port 9440
ufw allow from 10.0.0.0/8 to any port 8443
ufw deny 9000  # Block plain TCP
ufw deny 8123  # Block plain HTTP
ufw enable
```

## 5. Set Resource Limits

Prevent runaway queries from exhausting the server:

```xml
<profiles>
  <default>
    <max_execution_time>300</max_execution_time>
    <max_memory_usage>8589934592</max_memory_usage>
    <max_rows_to_read>1000000000</max_rows_to_read>
  </default>
</profiles>
```

## 6. Enable Query Logging

```xml
<query_log>
  <database>system</database>
  <table>query_log</table>
  <partition_by>toYYYYMM(event_date)</partition_by>
  <ttl>event_date + INTERVAL 90 DAY DELETE</ttl>
</query_log>
```

Always enable query logging in production. It's invaluable for security audits and incident investigations.

## 7. Harden the OS

```bash
# Run ClickHouse as a dedicated non-root user (default: clickhouse)
id clickhouse

# Restrict config file permissions
chmod 640 /etc/clickhouse-server/config.xml
chmod 640 /etc/clickhouse-server/users.xml
chown clickhouse:clickhouse /etc/clickhouse-server/*.xml

# Disable core dumps (prevent credential leaks)
echo 'clickhouse soft core 0' >> /etc/security/limits.conf
```

## 8. Enable Audit Logging

```xml
<session_log>
  <database>system</database>
  <table>session_log</table>
</session_log>
```

## Summary

Hardening ClickHouse for production involves disabling the default user, enabling TLS on all ports, binding to internal interfaces only, configuring firewalls, setting resource limits, and enabling comprehensive logging. Work through this checklist systematically and run regular security audits using the `system.query_log` and `system.session_log` tables to detect anomalous activity.
