# Validation Summary: How to Use Let's Encrypt Certificates with Portainer

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Portainer CE
- Let's Encrypt
- Certbot
- Docker
- Docker Compose
- OpenSSL
- curl
- TLS / HTTPS

## Sources Consulted
- Portainer documentation, "Using your own SSL certificate with Portainer": https://docs.portainer.io/advanced/ssl
- Portainer documentation, "CLI configuration options": https://docs.portainer.io/sts/advanced/cli
- Portainer documentation, "Deprecated and removed features": https://docs.portainer.io/advanced/deprecated
- Portainer documentation, "Updating Portainer": https://docs.portainer.io/sts/start/upgrade
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- OpenSSL documentation, "`openssl s_client`": https://docs.openssl.org/3.0/man1/openssl-s_client/

## Issues Found
- The `docker run` example used the deprecated `--ssl` flag. Portainer has enabled HTTPS on port `9443` by default since CE 2.9 / BE 2.10, so I removed `--ssl`.
- The Portainer certificate mounts used a single `/etc/letsencrypt` bind mount. Portainer's Certbot guidance explicitly calls out Certbot symlink handling and mounts both the `live` and `archive` directories, so I updated both the `docker run` and Compose examples to follow that pattern.
- The Docker Compose snippet used the top-level `version: "3.8"` field. Docker now treats `version` as obsolete, so I removed it.
- The renewal automation example restarted Portainer after any successful `certbot renew` run, even when no certificate was renewed. I changed it to use Certbot's `--deploy-hook` so Portainer restarts only after a successful renewal.
- The renewal section implied that users always need to create their own renewal schedule. Certbot documentation says most installations already include automated renewals, so I clarified that the cron entry is only needed if automated renewal is not already configured.
- The `openssl s_client` verification example did not send SNI. I added `-servername portainer.example.com` so the check requests the correct certificate for the hostname.

## Review Notes
- Portainer's documentation is currently a bit inconsistent around `--sslcert` and `--sslkey`: the custom certificate guide and CLI reference still document them for Portainer's UI certificate, while the deprecation page marks them as deprecated. I kept those flags because the current Portainer SSL guide for this exact setup still uses them.
- The workspace did not have `docker` or `certbot` installed, so validation of commands and flags was done against official documentation rather than local command execution.
