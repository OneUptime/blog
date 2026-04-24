# Validation Summary: How to Configure SSL/TLS for Portainer on Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker
- Docker Compose
- OpenSSL
- Certbot / Let's Encrypt
- TLS/SSL and X.509 certificates

## Sources Consulted
- Portainer Documentation, "Using your own SSL certificate with Portainer": https://docs.portainer.io/advanced/ssl
- Portainer Documentation, "CLI configuration options": https://docs.portainer.io/advanced/cli
- Portainer Documentation, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/start/install-ce/server/docker/linux
- Docker Docs, "Compose file reference": https://docs.docker.com/reference/compose-file/
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- Docker Hub, official `portainer/portainer-ce` tags: https://hub.docker.com/r/portainer/portainer-ce/tags
- OpenSSL CLI help: `openssl req -help`, `openssl x509 -help`

## Issues Found
- The Portainer deployment examples used `--ssl`, but current Portainer documentation documents `--sslcert` and `--sslkey` for custom server certificates and does not document a `--ssl` flag in the current CLI options. I removed `--ssl` from the `docker run` and Docker Compose examples.
- The Let's Encrypt workflow was incomplete for Docker-based Portainer. Portainer's official SSL documentation states that Certbot-managed certificates require mounting both the `live` and `archive` directories because Certbot uses symlinks, and that `--sslcert` should reference `fullchain.pem`. I updated the direct-mount example and added an explanatory note in the Certbot section.
- The Docker Compose example used the top-level `version: "3.8"` field. Docker's current Compose documentation marks the top-level `version` field as obsolete and only retained for backward compatibility. I removed it.
- The verification section treated `curl --cacert` as the general certificate-verification path. I split the examples so public CA certificates use the system trust store, while internal CA certificates use `--cacert`.
- The prerequisite text and Option 1 heading blurred the distinction between a self-signed server certificate and a server certificate signed by a self-signed internal CA. I corrected the wording to match the commands shown.
- The Certbot install command was written as if it were generic across distributions. I labeled it as a Debian/Ubuntu example and clarified that the standalone flow requires the domain to resolve to the server and port `80` to be reachable.

## Review Notes
- The OpenSSL commands in Option 1 were tested locally and produced a valid CA certificate plus a server certificate containing the expected SAN entries.
- The article still uses `portainer/portainer-ce:latest` in its examples. That tag is currently published on Docker Hub, although Portainer's documentation more commonly shows release-stream tags such as `:sts` or `:lts`.
- For Let's Encrypt, the direct-mount approach is the better fit for renewals because Certbot maintains the active certificate files under `/etc/letsencrypt/live/...`. This is an inference from Certbot's documented certificate layout and Portainer's documented symlink-mount requirement.
