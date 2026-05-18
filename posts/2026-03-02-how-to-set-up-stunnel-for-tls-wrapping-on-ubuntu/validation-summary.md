# Validation Summary: How to Set Up stunnel for TLS Wrapping on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- stunnel (stunnel4 package on Ubuntu)
- OpenSSL (certificate generation and s_client testing)
- systemd (service management)
- Redis (TLS-wrapped backend example)
- SMTP / SMTPS (port 465 wrapping example)
- PostgreSQL (TLS-wrapped backend example)
- Let's Encrypt / certbot (cert source)
- UFW (firewall rule example)
- mTLS (mutual TLS authentication)

## Sources Consulted
- stunnel official manual: https://www.stunnel.org/static/stunnel.html
- stunnel man page (`stunnel(8)`)
- Ubuntu/Debian `stunnel4` package documentation and `/etc/default/stunnel4` defaults
- OpenSSL `req`, `x509`, and `s_client` documentation: https://www.openssl.org/docs/manmaster/man1/
- Let's Encrypt certbot documentation for `fullchain.pem` / `privkey.pem` paths

## Issues Found
- **`sslVersion = TLSv1.2` was misleading and discouraged.** The `sslVersion` directive in stunnel 5.x pins the connection to *exactly* that version (blocking TLSv1.3), and the stunnel manual explicitly recommends using `sslVersionMin` / `sslVersionMax` instead. The accompanying comment said "only allow TLS", which doesn't match the actual behavior of locking to TLSv1.2 only. Changed to `sslVersionMin = TLSv1.2` in both the Redis server-mode example and the multi-services example, and updated the comment to accurately describe the effect (requires TLSv1.2 or newer, disables SSLv2/SSLv3/TLSv1.0/TLSv1.1). This is the modern recommended directive and also permits TLSv1.3.

## Review Notes
- The `stunnel4` package name and `/etc/default/stunnel4` `ENABLED=0` default are still accurate for current Ubuntu LTS releases (22.04 / 24.04).
- The `stunnel -version` flag is correct (output goes to stderr, which is normal for that command).
- The `verify = 2` semantics in the mTLS section are correct: it requires a valid client certificate that chains to the configured `CAfile`. Newer stunnel versions also support the more granular `verifyChain = yes` / `verifyPeer = yes` directives, but `verify = 2` is still supported and works.
- The `ciphers` directive only applies to TLSv1.2 and below; TLSv1.3 ciphersuites are controlled by the separate `ciphersuites` directive. The post doesn't set `ciphersuites`, which is fine because stunnel ships sensible TLSv1.3 defaults.
- Redis 6+ supports native TLS, so stunnel is most useful here for older Redis deployments or operators who prefer not to manage Redis's TLS configuration. The post's framing is still valid but worth keeping in mind.
- The `openssl s_client ... | openssl x509 > server.crt` pattern only captures the leaf cert; for chained certs you'd want `-showcerts`. This is fine for the self-signed example in the post.
- The `[redis-client]` example listens on `127.0.0.1:6379` on the client machine — readers running Redis locally on the client would hit a port conflict, but the example is otherwise correct for the intended use case.
