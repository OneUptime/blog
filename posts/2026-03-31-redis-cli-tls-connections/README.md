# How to Use Redis CLI with TLS Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLI, TLS, Security, Encryption

Description: Learn how to connect to a TLS-enabled Redis server using redis-cli, including certificate setup, one-way TLS, mutual TLS, and troubleshooting connection errors.

---

Redis supports TLS encryption for all client connections. When your Redis server is configured with TLS, you must pass the appropriate certificate flags to `redis-cli` to connect successfully.

## Prerequisites

Redis must be compiled with TLS support (`BUILD_TLS=yes`). Verify:

```bash
redis-cli --help 2>&1 | grep "\-\-tls"
```

## Connecting with One-Way TLS (Server Certificate Only)

If the server uses a certificate signed by a public CA:

```bash
redis-cli -h redis.example.com -p 6380 --tls
```

If the server uses a self-signed certificate, provide the CA cert:

```bash
redis-cli -h redis.example.com -p 6380 \
  --tls \
  --cacert /path/to/ca.crt
```

## Connecting with Mutual TLS (Client Certificate Required)

If the server requires client authentication:

```bash
redis-cli -h redis.example.com -p 6380 \
  --tls \
  --cacert /path/to/ca.crt \
  --cert /path/to/client.crt \
  --key /path/to/client.key
```

## Connecting to Redis with TLS and Password Auth

```bash
redis-cli -h redis.example.com -p 6380 \
  --tls \
  --cacert /path/to/ca.crt \
  -a "$REDIS_PASSWORD"
```

## Using a Redis URL with TLS

```bash
redis-cli -u "rediss://:$REDIS_PASSWORD@redis.example.com:6380"
```

Note: `rediss://` (with double s) indicates TLS.

## Storing TLS Flags in a Script

To avoid repeating flags, create a wrapper:

```bash
#!/bin/bash
# redis-tls.sh
exec redis-cli \
  -h "${REDIS_HOST:-redis.example.com}" \
  -p "${REDIS_PORT:-6380}" \
  --tls \
  --cacert "/etc/redis/certs/ca.crt" \
  -a "$REDIS_PASSWORD" \
  "$@"
```

Use it as:

```bash
./redis-tls.sh GET mykey
./redis-tls.sh INFO server
```

## Testing the TLS Connection

```bash
redis-cli -h redis.example.com -p 6380 --tls --cacert /etc/ssl/certs/ca.crt PING
# PONG
```

## Common TLS Errors and Fixes

**Error: `SSL_connect: Connection refused`**
- Verify the port number (TLS usually uses 6380, not 6379)

**Error: `SSL_connect: certificate verify failed`**
- Provide the correct CA certificate with `--cacert`
- Disable verify (development only): `--insecure` (not recommended for production)

**Error: `SSL_connect: no shared cipher`**
- Check TLS version compatibility between client and server

**Error: `NOAUTH Authentication required`**
- Add `-a password` or `--pass password` to the command

## Verifying the Certificate

Use OpenSSL to inspect the server certificate independently:

```bash
openssl s_client -connect redis.example.com:6380 -CAfile /etc/ssl/certs/ca.crt
```

Look for `Verify return code: 0 (ok)` to confirm the cert is valid.

## Summary

Connecting redis-cli to a TLS-enabled Redis server requires the `--tls` flag plus the `--cacert` option for self-signed certificates. Mutual TLS additionally requires `--cert` and `--key`. Store these flags in a wrapper script for convenience in daily operations and automation.
