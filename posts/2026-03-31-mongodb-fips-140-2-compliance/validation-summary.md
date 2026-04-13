# Validation Summary: How to Configure MongoDB for FIPS 140-2 Compliance

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB Enterprise (FIPS mode)
- OpenSSL (FIPS module, certificate generation, TLS testing)
- RHEL/CentOS FIPS mode setup
- SCRAM-SHA-256 authentication
- TLS/SSL cipher suite configuration

## Sources Consulted
- MongoDB documentation on FIPS configuration: https://www.mongodb.com/docs/manual/tutorial/configure-fips/
- MongoDB documentation on TLS/SSL configuration options (`net.tls.*` namespace introduced in 4.2): https://www.mongodb.com/docs/manual/reference/configuration-options/#net.tls-options
- MongoDB documentation on `setParameter.authenticationMechanisms`: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.authenticationMechanisms
- RHEL documentation on enabling FIPS mode (`fips-mode-setup`): https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Linux kernel FIPS check via `/proc/sys/crypto/fips_enabled`
- OpenSSL man pages for `req`, `s_client` commands

## Issues Found
1. **Incorrect minimum MongoDB version**: The prerequisites stated "MongoDB Enterprise 4.0 or later," but the configuration examples use the `net.tls.*` namespace (`net.tls.mode`, `net.tls.certificateKeyFile`, `net.tls.CAFile`, `net.tls.FIPSMode`), which was introduced in MongoDB 4.2. MongoDB 4.0 uses the older `net.ssl.*` namespace. Fixed the prerequisite to "MongoDB Enterprise 4.2 or later."

## Review Notes
- The `bindIp: 0.0.0.0` in the example config binds MongoDB to all network interfaces. While not a FIPS issue, production deployments should restrict this to specific interfaces for defense in depth.
- The explanation that `javascriptEnabled: false` prevents non-FIPS code paths is correct — MongoDB's embedded SpiderMonkey JS engine does not use the FIPS-validated OpenSSL module, so disabling it ensures all crypto operations go through the FIPS-validated path.
- The `-nodes` flag in the OpenSSL certificate generation command leaves the private key unencrypted on disk. This is standard for server certificate generation but operators should ensure appropriate file permissions in production.
- All `net.ssl.*` options are deprecated as of MongoDB 4.2 in favor of `net.tls.*`, so the configuration shown is current best practice.
- SCRAM-SHA-1 guidance is accurate: while HMAC-SHA-1 is technically still permitted under FIPS 140-2, MongoDB documentation recommends SCRAM-SHA-256 for FIPS mode deployments.
