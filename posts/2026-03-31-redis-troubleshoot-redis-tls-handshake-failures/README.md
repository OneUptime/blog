# How to Troubleshoot Redis TLS Handshake Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, TLS, Security, Troubleshooting, Certificate

Description: Learn how to diagnose and fix Redis TLS handshake failures caused by certificate mismatches, expired certs, or misconfigured TLS settings.

---

Redis TLS handshake failures prevent clients from establishing secure connections. These errors often surface as `SSL_connect: Connection refused` or `TLS handshake failed` in client logs. This guide walks through the most common causes and fixes.

## Check Redis TLS Configuration

Verify Redis is actually configured to use TLS:

```bash
redis-cli -h 127.0.0.1 -p 6380 --tls --cert /etc/redis/tls/client.crt --key /etc/redis/tls/client.key --cacert /etc/redis/tls/ca.crt ping
```

If you get `PONG`, the TLS layer is working. Otherwise, check the Redis config:

```bash
grep -i "tls\|ssl" /etc/redis/redis.conf
```

You should see entries like:

```text
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
```

## Verify Certificate Validity

A common cause of handshake failures is an expired or invalid certificate:

```bash
openssl x509 -in /etc/redis/tls/redis.crt -noout -dates
```

Check that the `notAfter` date is in the future. Also verify the subject and SAN fields match the hostname:

```bash
openssl x509 -in /etc/redis/tls/redis.crt -noout -text | grep -A2 "Subject Alternative Name"
```

## Test the TLS Handshake Directly

Use `openssl s_client` to simulate the TLS handshake:

```bash
openssl s_client -connect redis-host:6380 -CAfile /etc/redis/tls/ca.crt -cert /etc/redis/tls/client.crt -key /etc/redis/tls/client.key
```

Look for errors like:
- `verify error:num=10:certificate has expired` - renew the certificate
- `handshake failure` - cipher mismatch or protocol version issue
- `certificate verify failed` - CA chain is incomplete

## Fix Common TLS Errors

**Certificate authority mismatch:** Ensure both the Redis server and client trust the same CA:

```bash
# Verify the CA used to sign the server cert
openssl verify -CAfile /etc/redis/tls/ca.crt /etc/redis/tls/redis.crt
```

**TLS protocol version mismatch:** Force a minimum TLS version in `redis.conf`:

```text
tls-protocols "TLSv1.2 TLSv1.3"
```

**Mutual TLS (mTLS) required but client cert missing:** If Redis requires client authentication, set `tls-auth-clients yes` and ensure every client provides a valid cert.

## Monitor TLS Errors with OneUptime

OneUptime can alert you when Redis connectivity drops due to TLS issues. Set up an HTTP or TCP monitor against your Redis endpoint and configure alert rules for connection failures. This gives you immediate notification when certificate expiry causes handshake failures before users are impacted.

```bash
# Check Redis log for TLS-related errors
journalctl -u redis -n 100 | grep -i "tls\|ssl\|handshake"
```

## Summary

Redis TLS handshake failures are typically caused by expired certificates, CA mismatches, or protocol version incompatibilities. Use `openssl s_client` to directly test the TLS handshake and inspect certificate validity. Keeping certificates monitored and auto-renewed is the most reliable way to prevent production TLS outages.
