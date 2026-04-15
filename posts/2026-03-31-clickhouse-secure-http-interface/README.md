# How to Secure ClickHouse HTTP Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, HTTP Interface, TLS, Authentication

Description: Secure the ClickHouse HTTP interface by enabling HTTPS, requiring authentication, configuring CORS, and placing it behind a reverse proxy for production deployments.

---

ClickHouse's HTTP interface is powerful and convenient, but it exposes the full query API over a network port. In production, this interface needs TLS encryption, strong authentication, and ideally a reverse proxy layer to prevent direct public exposure.

## Switching from HTTP to HTTPS

Disable the plain HTTP port and enable HTTPS only:

```xml
<clickhouse>
  <!-- Disable plain HTTP -->
  <http_port remove="remove"></http_port>

  <!-- Enable HTTPS -->
  <https_port>8443</https_port>

  <openSSL>
    <server>
      <certificateFile>/etc/clickhouse-server/ssl/server.crt</certificateFile>
      <privateKeyFile>/etc/clickhouse-server/ssl/server.key</privateKeyFile>
      <verificationMode>relaxed</verificationMode>
      <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
    </server>
  </openSSL>
</clickhouse>
```

## Testing the Secured Interface

```bash
# Connect using HTTPS with authentication
curl -k -u 'admin:SecurePass!123' \
    'https://clickhouse-host:8443/?query=SELECT+1'

# Using a CA certificate for verification
curl --cacert /etc/ssl/certs/my-ca.crt \
    -u 'admin:SecurePass!123' \
    'https://clickhouse-host:8443/?query=SELECT+version()'
```

## Configuring HTTP Authentication Headers

For programmatic access, use HTTP Basic Auth or query string credentials. Avoid passing credentials in URLs which may appear in logs:

```bash
# Preferred: use Authorization header
curl -H 'Authorization: Basic YWRtaW46U2VjdXJlUGFzcyExMjM=' \
    'https://clickhouse-host:8443/' \
    --data-binary "SELECT count() FROM events WHERE date = today()"
```

## Using a Reverse Proxy (Nginx)

Place ClickHouse behind Nginx to add IP allowlisting, rate limiting, and centralized TLS termination:

```nginx
server {
    listen 443 ssl;
    server_name analytics-api.example.com;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Allow only internal networks
    allow 10.0.0.0/8;
    deny all;

    # Rate limiting
    limit_req zone=clickhouse_api burst=20 nodelay;

    location / {
        proxy_pass https://clickhouse-host:8443;
        proxy_ssl_verify off;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Restricting HTTP Handlers

Disable HTTP handlers you don't need:

```xml
<http_handlers>
  <rule>
    <url>/</url>
    <methods>POST</methods>
    <handler>
      <type>predefined_query_handler</type>
      <query>SELECT 1</query>
    </handler>
  </rule>
  <!-- Disable the ping handler if not needed for load balancers -->
  <!-- <rule><url>/ping</url></rule> -->
</http_handlers>
```

## CORS Configuration

If browser-based clients need access, configure CORS carefully:

```xml
<http_options_response>
  <header>
    <name>Access-Control-Allow-Origin</name>
    <value>https://your-dashboard.example.com</value>
  </header>
  <header>
    <name>Access-Control-Allow-Methods</name>
    <value>POST, GET, OPTIONS</value>
  </header>
</http_options_response>
```

Never set `Access-Control-Allow-Origin: *` on a ClickHouse server with sensitive data.

## Monitoring HTTP Interface Access

```sql
SELECT
    http_user_agent,
    user,
    count() AS requests,
    countIf(exception != '') AS errors
FROM system.query_log
WHERE interface = 2  -- 2 = HTTP
    AND event_date = today()
GROUP BY http_user_agent, user
ORDER BY requests DESC
LIMIT 20;
```

Watch for unusual user agents or unexpected users accessing via HTTP.

## Summary

Secure the ClickHouse HTTP interface by switching to HTTPS-only, using strong authentication, placing the server behind a reverse proxy with IP allowlisting and rate limiting, and regularly auditing HTTP access patterns through `system.query_log`. Disable any HTTP handlers that your application doesn't need to minimize the attack surface.
