# Validation Summary: How to Manage the System-Wide CA Trust Store on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- `ca-certificates`
- `update-ca-trust`
- p11-kit `trust`
- OpenSSL
- GnuTLS and NSS trust integration
- Java `cacerts` trust store
- Podman containers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using shared system certificates": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks
- `update-ca-trust(8)` man page: https://www.mankier.com/8/update-ca-trust
- `trust(1)` man page: https://www.mankier.com/1/trust
- OpenSSL `openssl-verify(1)` documentation: https://docs.openssl.org/3.1/man1/openssl-verify/
- Python `ssl.get_default_verify_paths()` documentation: https://docs.python.org/3/library/ssl.html#ssl.get_default_verify_paths
- Oracle/OpenJDK `keytool` documentation: https://docs.oracle.com/en/java/javase/18/docs/specs/man/keytool.html

## Issues Found
- The post implied that every RHEL TLS connection uses the system-wide trust store. I narrowed this to applications that use the system trust store, because applications can carry or configure their own trust stores.
- The post described RHEL as funneling everything through a single certificate store. I changed this to the official shared trust model for NSS, GnuTLS, OpenSSL, and Java.
- The diagram only showed `/etc/pki/ca-trust/source/` and mapped `/etc/pki/tls/certs/ca-bundle.trust.crt` to GnuTLS. I updated it to include `/usr/share/pki/ca-trust-source/`, `update-ca-trust extract`, the extracted PEM and OpenSSL bundle paths, the Java symlink path, and p11-kit for NSS/GnuTLS.
- The text omitted that `/usr/share/pki/ca-trust-source/` is a lower-priority source tree and that `/etc/pki/ca-trust/source/` has higher priority for local administrator changes. I added that distinction.
- The examples used bare `update-ca-trust` in places where Red Hat documentation and the man page specifically document `update-ca-trust extract` after trust-store changes. I updated the commands and explanatory text.
- The extraction example said `trust list` extracts certificates and described the bundle search as searching for an issuer. I corrected the wording to identify a certificate and search for a bundle comment or label.
- The wrap-up said every application picks up changes. I narrowed this to applications that use the system trust store.

## Review Notes
The remaining examples are technically plausible for RHEL 9, but some commands are environment-dependent. For example, `curl -v` output depends on how curl was built, Java behavior assumes the RHEL default trust-store integration, and containers only see host trust changes when rebuilt or when the relevant host trust files are mounted.
