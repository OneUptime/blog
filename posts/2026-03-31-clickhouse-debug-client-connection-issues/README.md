# How to Debug ClickHouse Client Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Client, Connection, Debug, Troubleshooting

Description: Debug ClickHouse client connection issues by testing connectivity, verifying credentials, handling TLS, and diagnosing protocol mismatches.

---

ClickHouse client connection issues range from network unreachability to TLS certificate errors and authentication failures. This guide walks through a systematic debugging approach for both `clickhouse-client` and the HTTP interface.

## Try the Simplest Connection First

```bash
# Minimal local connection
clickhouse-client --query "SELECT 1"

# Explicit parameters
clickhouse-client \
  --host 127.0.0.1 \
  --port 9000 \
  --user default \
  --password '' \
  --query "SELECT 1"
```

## Enable Debug Logging

```bash
clickhouse-client \
  --host myserver \
  --port 9000 \
  --log-level debug \
  --query "SELECT 1" 2>&1 | head -30
```

Debug output shows exactly where the connection fails.

## Test the HTTP Interface Separately

```bash
# HTTP - simpler to debug than the native protocol
curl -v "http://myserver:8123/ping"

# With credentials
curl -v "http://myserver:8123/?user=my_user&password=secret&query=SELECT+1"

# Or with headers
curl -v -H "X-ClickHouse-User: my_user" \
        -H "X-ClickHouse-Key: secret" \
        "http://myserver:8123/?query=SELECT+1"
```

## Test Raw TCP Connectivity

```bash
# Test native protocol port
nc -zv myserver 9000

# Test HTTP port
nc -zv myserver 8123
```

If this fails, the issue is network/firewall, not ClickHouse itself.

## Debug TLS/SSL Issues

For HTTPS connections:

```bash
# Test TLS certificate
openssl s_client -connect myserver:8443 -verify 5

# Connect with certificate verification disabled (testing only)
clickhouse-client \
  --host myserver \
  --port 9440 \
  --secure \
  --accept-invalid-certificate \
  --query "SELECT 1"
```

Provide the correct CA certificate via a client config file (there is no CLI flag for this — `clickhouse-client` reads `openSSL.client.caConfig` from its config):

```xml
<!-- ~/.clickhouse-client/config.xml -->
<config>
  <openSSL>
    <client>
      <caConfig>/etc/ssl/certs/my-ca.crt</caConfig>
      <verificationMode>strict</verificationMode>
    </client>
  </openSSL>
</config>
```

```bash
clickhouse-client \
  --host myserver \
  --port 9440 \
  --secure \
  --query "SELECT 1"
```

## Check Protocol Version Mismatch

Old clients may fail with newer server versions:

```bash
clickhouse-client --version
# Check against server version:
clickhouse-client --host myserver --query "SELECT version()"
```

## Review Server Logs During Connection

On the server during a connection attempt:

```bash
sudo tail -f /var/log/clickhouse-server/clickhouse-server.log | grep "New connection\|Auth\|Exception"
```

## Common Error Quick Reference

```text
Connection refused     - Server not running or wrong port
Network unreachable    - Routing/firewall issue
Authentication failed  - Wrong user/password
SSL error              - Certificate mismatch or expired cert
Timeout                - Network latency or server overloaded
```

## Summary

Debug ClickHouse client connection issues by testing the simplest possible connection first, then adding complexity. Use `--log-level debug` to trace the native protocol connection, test the HTTP interface with curl for easier troubleshooting, and verify TLS certificates separately with `openssl s_client`. Server logs show authentication failures and connection errors in real time.
