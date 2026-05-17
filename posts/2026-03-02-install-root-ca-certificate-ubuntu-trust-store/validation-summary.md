# Validation Summary: How to Install a Root CA Certificate in the Ubuntu Trust Store

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (ca-certificates package, `update-ca-certificates`)
- OpenSSL (x509, s_client, verify)
- PEM / DER certificate formats
- HashiCorp Vault (PKI secrets engine)
- Python (certifi, requests)
- Node.js (NODE_EXTRA_CA_CERTS)
- curl
- Java keytool (OpenJDK 17 cacerts)
- Docker (`/etc/docker/certs.d/`)

## Sources Consulted
- Ubuntu manpage: `update-ca-certificates` — https://manpages.ubuntu.com/manpages/noble/man8/update-ca-certificates.8.html
- Debian `ca-certificates` source (`update-ca-certificates` script) — https://salsa.debian.org/debian/ca-certificates
- Ubuntu Server docs: Install a root CA in the trust store — https://ubuntu.com/server/docs/security-trust-store
- OpenSSL `s_client` manual — https://docs.openssl.org/1.1.1/man1/s_client/
- OpenSSL 1.1.1 CHANGES file (confirms `-brief` since 1.0.2)
- HashiCorp Vault PKI API docs — https://developer.hashicorp.com/vault/api-docs/secret/pki
- Node.js Enterprise Network Configuration — https://nodejs.org/learn/http/enterprise-network-configuration
- Docker: Verify repository client with certificates — https://docs.docker.com/engine/security/certificates/
- Python `requests` SSL_CERT_FILE handling — psf/requests issue #2899

## Issues Found
1. **Misleading expected output for `update-ca-certificates --fresh`**
   - **What was wrong:** The "Removing a CA Certificate" section showed `sudo update-ca-certificates --fresh` paired with "Expected output: 0 added, 1 removed". With `--fresh`, the script first clears every managed symlink under `/etc/ssl/certs/` and then re-adds all valid certificates, so the actual output is closer to `~140 added, 0 removed` (or whatever the total trusted-cert count is). The `"0 added, 1 removed"` output is what you get from a *non*-fresh run after deleting one cert.
   - **Fix applied:** Reworked the example to first show the plain `sudo update-ca-certificates` (which matches the stated `0 added, 1 removed` output), then explain what `--fresh` actually does and warn that its counts will differ. This preserves both the original intent (showing removal) and the `--fresh` flag as a follow-up option without misrepresenting its behavior.

## Review Notes
- **OpenSSL `-brief` flag:** The post uses `openssl s_client ... -brief` but does not cite a version. For reference, `-brief` has been available since OpenSSL 1.0.2 (January 2015), so this works on all currently-supported Ubuntu LTS releases. No change needed.
- **Node.js `NODE_USE_SYSTEM_CA` (potential future improvement, not an error):** The post correctly states that Node.js does not use the system trust store by default and recommends `NODE_EXTRA_CA_CERTS`. As of Node.js v22.15.0 / v23.9.0 / v24.0.0, you can also enable system trust store usage with `--use-system-ca` or `NODE_USE_SYSTEM_CA=1`. This is a newer alternative worth mentioning in a future revision but not technically incorrect as written.
- **Python `SSL_CERT_FILE` caveat:** `SSL_CERT_FILE` is honored by OpenSSL directly and by Python's stdlib `ssl` module, but `requests` itself only reads `REQUESTS_CA_BUNDLE` / `CURL_CA_BUNDLE`. The post presents `SSL_CERT_FILE` as having "broader coverage", which is true for most non-`requests` Python code paths. Acceptable as written.
- **Debian/Ubuntu `ca-certificates-java`:** The post documents the manual `keytool -import` approach for Java. On Ubuntu, the `ca-certificates-java` package usually keeps `cacerts` in sync with the system trust store automatically. The manual approach in the post still works and is sometimes preferred (e.g., for hand-rolled JDK installs), so no change needed.
- **Docker registry path with non-default ports:** For private registries listening on non-443 ports, the directory must be `/etc/docker/certs.d/<host>:<port>/` (not just `<host>/`). The example uses an implicit 443 host, so it is correct as written, but readers using non-standard ports should be aware.
