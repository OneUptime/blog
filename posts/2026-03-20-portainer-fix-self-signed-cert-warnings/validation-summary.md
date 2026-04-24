# Validation Summary: How to Fix Self-Signed Certificate Warnings in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- TLS / SSL certificates
- Let's Encrypt / Certbot
- OpenSSL
- Docker
- Nginx reverse proxy
- Linux trust stores
- macOS trust store
- Windows certificate store
- Chrome
- Firefox

## Sources Consulted
- Portainer: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer: Deploying Portainer behind nginx reverse proxy - https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer CLI options - https://docs.portainer.io/sts/advanced/cli
- Portainer source: status endpoint handlers (`/system/status` and deprecated `/status`) - https://github.com/portainer/portainer/blob/develop/api/http/handler/system/status.go
- Portainer source: API router mapping for `/api/status` and `/api/system` - https://github.com/portainer/portainer/blob/develop/api/http/handler/handler.go
- Certbot documentation - https://eff-certbot.readthedocs.io/en/stable/install.html
- OpenSSL `req` documentation - https://docs.openssl.org/3.4/man1/openssl-req/
- OpenSSL `x509` documentation - https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL X.509 extension configuration - https://docs.openssl.org/3.1/man5/x509v3_config/
- Debian `update-ca-certificates` man page - https://manpages.debian.org/testing/ca-certificates/update-ca-certificates.8.en.html
- Red Hat shared system certificates documentation - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/securing_networks/using-shared-system-certificates
- Apple certificate requirements for TLS server certificates - https://support.apple.com/en-us/103769
- Chrome Help: Manage device certificates - https://support.google.com/chrome/answer/10468685?co=GENIE.Platform%3DDesktop&hl=en
- Firefox for Enterprise: Set up Certificate Authorities (CAs) in Firefox - https://support.mozilla.org/en-US/kb/setting-certificate-authorities-firefox
- Microsoft Learn: `Import-Certificate` - https://learn.microsoft.com/en-us/powershell/module/pki/import-certificate?view=windowsserver2025-ps

## Issues Found
- The original Portainer deployment commands copied certificate files into the data volume and restarted the container. Portainer's official Docker guidance uses mounted certificate paths with `--sslcert` and `--sslkey`, and Certbot deployments must mount both the `live` and `archive` directories because of symlinks. I replaced both deployment examples accordingly.
- The internal CA certificate generation did not explicitly mark the certificate as a CA. I added `basicConstraints=CA:TRUE` and CA signing `keyUsage` so the CA is defined correctly.
- The server certificate generation only added a SAN and omitted an explicit server-auth EKU. I added `basicConstraints=CA:FALSE`, `keyUsage`, `extendedKeyUsage=serverAuth`, and SAN handling so the certificate matches current client expectations, including Apple's documented TLS requirements.
- The RHEL-family trust-store example used `update-ca-trust` without the documented `extract` subcommand. I corrected it to `update-ca-trust extract`.
- The Nginx section suggested keeping Portainer on its self-signed HTTPS endpoint and using `--proxy-ssl-verify off`, which is not the Nginx directive syntax and is not how Portainer's official nginx example is documented. I corrected the guidance to proxy to Portainer's internal HTTP port `9000`.
- The verification example used `/api/status`; current Portainer source marks `/status` as deprecated in favor of `/system/status`. I updated the `curl` example to `/api/system/status`.
- The `openssl s_client` example did not use SNI and depended on the caller's ambient trust store. I added `-servername` and `-CAfile` so the check reflects the intended CA trust path deterministically.
- The browser section stated that Chrome and Firefox maintain separate certificate stores in the way described. Current Chrome documentation says Chrome imports custom roots from the operating system, and current Firefox enterprise documentation says Firefox on Windows and macOS can automatically trust third-party roots from the OS. I corrected that section.
- The conclusion claimed users would "never" see warnings again. I softened that to the technically correct condition that trust also depends on the certificate matching the hostname clients use.

## Review Notes
- The post is technically relevant and salvageable; it remains a valid Docker Standalone guide after correction.
- The Docker commands were checked against Portainer's official documentation, but they were not executed locally because this review environment is not a running Portainer host.
- The trust-store commands for macOS and Windows were checked against vendor documentation, but not executed in this Linux review environment.
- The guide still assumes a Docker Standalone deployment with a container named `portainer`. Swarm, Kubernetes, or Portainer UI-based certificate replacement use different procedures.
