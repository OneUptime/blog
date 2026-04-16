# How to Set Up HTTP Basic Authentication in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Authentication, HTTP, Security, Access Control

Description: Learn how to configure HTTP Basic Authentication in ClickHouse to secure HTTP interface connections with username and password credentials.

---

ClickHouse exposes an HTTP interface (default port 8123) that is widely used by drivers, dashboards, and integrations. Securing this interface with HTTP Basic Authentication is one of the simplest ways to prevent unauthorized access.

## How HTTP Basic Authentication Works in ClickHouse

When a client sends an HTTP request to ClickHouse, it includes credentials in the `Authorization` header using Base64 encoding. ClickHouse validates the credentials against its user store before executing any query.

```bash
curl -u myuser:mypassword 'http://localhost:8123/?query=SELECT+1'
```

You can also pass credentials as URL parameters (though this is less secure):

```bash
curl 'http://localhost:8123/?user=myuser&password=mypassword&query=SELECT+1'
```

## Creating a User for HTTP Authentication

Define users in `users.xml` or via SQL. Using SQL is the recommended modern approach:

```sql
CREATE USER http_user
IDENTIFIED WITH sha256_password BY 'StrongPassword123!';
```

Grant the necessary permissions:

```sql
GRANT SELECT ON mydb.* TO http_user;
```

## Configuring HTTP Interface Settings

The HTTP interface is enabled by default. Verify or configure it in `config.xml`:

```text
<http_port>8123</http_port>
```

To bind only on specific interfaces (recommended for production):

```text
<listen_host>10.0.0.5</listen_host>
```

## Testing Authentication

Test with curl using the `-u` flag:

```bash
curl -u http_user:StrongPassword123! \
  'http://localhost:8123/?query=SELECT+currentUser()'
```

Expected output:

```text
http_user
```

Test that unauthenticated requests are rejected:

```bash
curl -v 'http://localhost:8123/?query=SELECT+1'
```

This should return `HTTP 403 Forbidden` if the `default` user has a password set.

## Securing the Default User

By default, the `default` user has no password. Always set a password in production:

```sql
ALTER USER default IDENTIFIED WITH sha256_password BY 'SecureDefaultPass!';
```

Or in `users.xml`:

```text
<users>
  <default>
    <password_sha256_hex>...</password_sha256_hex>
  </default>
</users>
```

## Using HTTP Basic Auth with HTTPS

Combine HTTP Basic Authentication with TLS to protect credentials in transit. In `config.xml`:

```text
<https_port>8443</https_port>
<openSSL>
  <server>
    <certificateFile>/etc/clickhouse-server/server.crt</certificateFile>
    <privateKeyFile>/etc/clickhouse-server/server.key</privateKeyFile>
  </server>
</openSSL>
```

Then connect securely:

```bash
curl -u http_user:StrongPassword123! \
  --cacert /etc/ssl/certs/ca.crt \
  'https://localhost:8443/?query=SELECT+1'
```

## Best Practices

- Always use HTTPS when sending credentials over the network
- Use SHA256 password hashing instead of plaintext
- Create dedicated users per application - avoid sharing credentials
- Restrict users to specific databases and tables with GRANT statements
- Monitor the `system.session_log` table for failed authentication attempts

```sql
SELECT user, failure_reason, event_time
FROM system.session_log
WHERE type = 'LoginFailure'
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

HTTP Basic Authentication in ClickHouse is straightforward to configure. Create users with strong passwords, assign minimal permissions via GRANT, secure the `default` user, and always use HTTPS in production to prevent credential interception. This setup is compatible with most ClickHouse clients and tools out of the box.
