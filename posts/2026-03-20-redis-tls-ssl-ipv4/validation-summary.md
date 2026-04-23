# Validation Summary: How to Configure Redis TLS/SSL for IPv4 Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Open Source
- TLS / SSL
- OpenSSL
- redis-cli
- redis-py (Python)
- ioredis (Node.js)
- Linux firewall configuration with iptables

## Sources Consulted
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis Linux installation documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- Redis self-documented `redis.conf`: https://github.com/redis/redis/blob/unstable/redis.conf
- OpenSSL `req` documentation: https://docs.openssl.org/1.1.1/man1/req/
- OpenSSL `x509` documentation: https://docs.openssl.org/1.1.1/man1/x509/
- OpenSSL `s_client` documentation: https://docs.openssl.org/1.1.1/man1/s_client/
- OpenSSL verification options: https://docs.openssl.org/3.4/man1/openssl-verification-options/
- redis-py connection parameters: https://redis.readthedocs.io/en/v6.2.0/connections.html
- redis-py SSL examples: https://redis.readthedocs.io/en/v6.0.0/examples/ssl_connection_examples.html
- ioredis TLS options: https://github.com/redis/ioredis
- Let's Encrypt IP certificate availability: https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability.html
- Let's Encrypt IP certificate details: https://letsencrypt.org/2025/07/01/issuing-our-first-ip-address-certificate

## Issues Found
1. The introduction overstated Redis TLS availability. Redis supports TLS starting with version 6, but the official Redis docs note that it must be built with TLS support. Updated the opening sentence to reflect that requirement.

2. The certificate-generation commands wrote files into `/etc/redis/tls` before creating that directory, and the file-writing commands were missing `sudo` even though they target `/etc`. Moved directory creation before certificate generation and added `sudo` to the OpenSSL commands that write into `/etc/redis/tls`.

3. The server certificate example only set the certificate subject CN to the IPv4 address. That is not sufficient for reliable IP-based certificate validation because OpenSSL verifies IP identities against the Subject Alternative Name extension. Added a small extension file with `subjectAltName = IP:10.0.0.5` and used it when signing the certificate.

4. The `openssl s_client` verification example only checked the CA chain and did not explicitly verify the IPv4 identity or fail fast on certificate validation errors. Updated the command to include `-verify_return_error` and `-verify_ip 10.0.0.5`.

5. The production certificate note was too broad for the example as written. The post uses a private RFC1918 address (`10.0.0.5`), so a public CA such as Let's Encrypt is only applicable for publicly reachable IPs or DNS names. Clarified that note.

6. The restart command used `sudo systemctl restart redis`, but the post's config path (`/etc/redis/redis.conf`) matches the Debian/Ubuntu packaging convention where the service name is typically `redis-server`. Updated the command accordingly.

## Review Notes
- The Redis TLS configuration directives in the post are otherwise consistent with the official Redis TLS documentation: `tls-port`, `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file`, `tls-auth-clients`, `tls-replication`, and `tls-cluster` are all valid.
- `requirepass` is still supported and works for the default user, but newer Redis deployments may prefer ACL-based user configuration for finer-grained authentication and authorization.
- The `iptables` rules are syntactically valid, but in real deployments the exact rule order and default policy still need to be checked carefully against the host's existing firewall policy.
