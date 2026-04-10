# Validation Summary: How to Configure Redis TLS Certificate and Key Settings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TLS support, available since Redis 6.0)
- OpenSSL (certificate generation)
- redis-cli (TLS connection flags)
- redis-py (Python Redis client with SSL parameters)

## Sources Consulted
- Redis TLS Documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis INFO Command Documentation: https://redis.io/docs/latest/commands/info/
- Redis Configuration Documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis redis.conf reference (unstable branch): https://github.com/redis/redis/blob/unstable/redis.conf
- Redis server.c source (7.2.4) for INFO field verification
- redis-py SSL connection source: https://github.com/redis/redis-py/blob/master/redis/connection.py

## Issues Found

### Issue 1: Verification command missing client certificate flags
**What was wrong:** The `redis-cli` command in the "Verifying TLS Configuration" section used only `--cacert` without `--cert` and `--key`. Since the post configures `tls-auth-clients yes` (mutual TLS), connecting without presenting a client certificate would cause the TLS handshake to be rejected.

**What was changed:** Added `--cert /etc/redis/tls/redis.crt` and `--key /etc/redis/tls/redis.key` flags to the verification `redis-cli` command, consistent with the mTLS configuration shown earlier in the post.

### Issue 2: Fabricated Redis INFO output fields
**What was wrong:** The expected output showed `tls_mode:standalone` and `tls_enabled:1`. These fields do not exist in any version of Redis's INFO server output. Verified by checking the Redis source code (`server.c` in versions 7.2.4 and unstable HEAD) — the `genRedisInfoString` function does not emit these fields. The `redis_mode` field (standalone/sentinel/cluster) exists, but `tls_mode` does not. There is no `tls_enabled` field.

**What was changed:** Replaced `grep tls` with `grep tcp_port`, which outputs `tcp_port:0` — confirming the plaintext port is disabled. Added an explanatory note that a successful TLS connection itself confirms TLS is working, and `tcp_port:0` confirms plaintext is disabled.

## Review Notes
- The `tls-ciphers` directive applies only to TLSv1.2 and below. For TLSv1.3, Redis uses the separate `tls-ciphersuites` directive. The post does not mention this distinction, but since TLSv1.3 has sensible cipher defaults and the post's cipher string is valid for TLSv1.2, this is not an error — just something to be aware of.
- The `ssl_cert_reqs=ssl.CERT_REQUIRED` in the Python example is technically the default behavior in redis-py, but being explicit about it is good practice for a tutorial.
- All OpenSSL commands for certificate generation are correct and follow standard practices.
- All Redis configuration directives (`tls-port`, `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file`, `tls-auth-clients`, `tls-protocols`, `tls-ciphers`, `tls-replication`) are valid and correctly used.
- File permissions (600 for private key, 644 for certificates) follow security best practices.
