# Validation Summary: How to Fix Portainer Self-Signed Certificate Warnings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- TLS/SSL certificates
- Let's Encrypt / Certbot
- OpenSSL
- Chromium-based browsers
- Firefox
- Linux CA trust stores

## Sources Consulted
- Portainer: Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Portainer: CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer: Deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- Portainer: Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer source: `api/cli/cli.go`: https://raw.githubusercontent.com/portainer/portainer/develop/api/cli/cli.go
- Portainer source: `api/cmd/portainer/main.go`: https://raw.githubusercontent.com/portainer/portainer/develop/api/cmd/portainer/main.go
- Portainer source: `api/internal/ssl/ssl.go`: https://raw.githubusercontent.com/portainer/portainer/develop/api/internal/ssl/ssl.go
- Portainer source: `pkg/libcrypto/ssl.go`: https://raw.githubusercontent.com/portainer/portainer/develop/pkg/libcrypto/ssl.go
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- OpenSSL `req` documentation: https://docs.openssl.org/3.6/man1/openssl-req/
- OpenSSL `x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.4/man1/openssl-s_client/
- Debian `update-ca-certificates` man page: https://manpages.debian.org/bookworm/ca-certificates/update-ca-certificates.8.en.html
- Red Hat trust store documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/securing_networks/adding-new-certificates-to-the-system-wide-truststore
- Chromium Service Worker Debugging FAQ: https://new.chromium.org/blink/serviceworker/service-worker-faq/
- Firefox Help: Troubleshoot security error codes on secure websites: https://support.mozilla.org/en-US/kb/error-codes-secure-websites

## Issues Found
- The Portainer container example used deprecated and partially outdated certificate flags. I replaced `--ssl`, `--sslcert`, and `--sslkey` with the current `--tlscert` and `--tlskey` usage validated against Portainer's current source and deprecation guidance.
- The Let's Encrypt bind mount example was not reliable for Portainer because Certbot's `live` files are symlinks into `archive`. I changed the example to mount both the `live` and `archive` directories, matching Portainer's official SSL documentation.
- The internal CA example did not explicitly mark the generated CA certificate as a CA. I added the CA-specific extensions so the generated certificate is clearly suitable for signing internal server certificates.
- Solution 2 generated a certificate but did not say how to use it with Portainer. I added a minimal note pointing readers to the `--tlscert` and `--tlskey` flags already shown in Solution 1.
- The browser exception section incorrectly described bypasses as permanent trust. I corrected Chrome/Edge and Firefox wording to reflect that these are development-time bypasses, not a general long-term trust solution.
- The self-signed trust section implied it would broadly fix the warning. I clarified that trusting the certificate only resolves trust errors and does not fix hostname or IP mismatches.
- The `openssl s_client` extraction command was improved to include `-showcerts` and `-servername localhost` for clearer, more reliable certificate retrieval.

## Review Notes
- Portainer's published documentation is currently inconsistent: the SSL article still shows `--sslcert` and `--sslkey`, while the deprecation table and current source mark them as deprecated in favor of `--tlscert` and `--tlskey`.
- Portainer's auto-generated certificate is self-signed and generated from `localhost` plus the HTTPS bind host. If the bind host is left at the default `:9443`, replacing trust alone may still not solve access via a different hostname or LAN IP.
