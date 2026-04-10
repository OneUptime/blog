# Validation Summary: How to Set Up Redis Mutual TLS (mTLS) Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TLS support, introduced in Redis 6.0)
- OpenSSL (certificate generation)
- Python ssl module
- redis-py (Python Redis client)
- redis-cli (Redis CLI with TLS flags)

## Sources Consulted
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- OpenSSL man pages for genrsa, req, x509 commands
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
- **Inconsistent file path in test command**: The "Test That mTLS Is Enforced" section used a relative path `--cacert ca.crt` while all other examples in the post used absolute paths (e.g., `/etc/redis/tls/ca.crt`). Fixed to use `/etc/redis/tls/ca.crt` for consistency and to avoid confusion.

## Review Notes
- The Python code uses `ssl.PROTOCOL_TLS_CLIENT` which is the current recommended approach (not deprecated). `check_hostname = False` is correctly set since the connection is to an IP address (127.0.0.1) rather than a hostname matching the certificate CN.
- The certificate rotation section is brief but accurate. A more detailed guide could show the actual steps of concatenating CA certs into a bundle file, but the current advice is correct.
- `tls-auth-clients yes` is actually the default when TLS is enabled in Redis, but explicitly setting it is good practice for clarity and is not an error.
