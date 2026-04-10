# Validation Summary: How to Troubleshoot Redis TLS Handshake Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (6.0+ TLS support)
- OpenSSL (x509 certificate inspection, s_client handshake testing, verify)
- TLS/SSL (TLSv1.2, TLSv1.3, mutual TLS / mTLS)
- redis-cli (TLS connection flags)
- systemd journalctl (log inspection)

## Sources Consulted
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- redis-cli manual and `--tls`, `--cert`, `--key`, `--cacert` flag documentation
- OpenSSL x509, s_client, and verify man pages: https://www.openssl.org/docs/man3.0/man1/
- Redis configuration reference for `tls-port`, `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file`, `tls-protocols`, `tls-auth-clients` directives

## Issues Found
1. **Port mismatch in redis-cli command**: The `redis-cli` example used `-p 6379` (the standard non-TLS port) with the `--tls` flag, but the Redis TLS configuration shown immediately after specifies `tls-port 6380`. Connecting with `--tls` to a non-TLS port would itself cause a handshake failure. Fixed by changing `-p 6379` to `-p 6380` to match the TLS port in the configuration example.

## Review Notes
- The error message `SSL_connect: Connection refused` mentioned in the intro is slightly misleading — "Connection refused" is a TCP-level error (ECONNREFUSED), not a TLS handshake error. More typical TLS-related errors from redis-cli would be `SSL_connect failed: certificate verify failed` or similar. However, the second example `TLS handshake failed` is accurate, and the phrasing is acceptable for a general troubleshooting guide.
- The `journalctl -u redis` command assumes the systemd service is named `redis`. On some distributions (e.g., Debian/Ubuntu), the service is named `redis-server`. This is a minor environment-specific difference and not incorrect.
- All OpenSSL commands, Redis configuration directives, and TLS protocol references are accurate for Redis 6.0+ and current OpenSSL versions.
- The `tls-auth-clients yes` directive is correctly described as enabling mutual TLS (mTLS) client certificate authentication.
