# Validation Summary: How to Set Up Custom SSL Certificates in Portainer on Docker

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Portainer CE (Community Edition)
- Docker (standalone)
- Docker Compose
- SSL/TLS certificates (PEM format)
- OpenSSL (verification)
- curl (verification)

## Sources Consulted
- [Portainer Documentation - Using your own SSL certificate](https://docs.portainer.io/advanced/ssl)
- [Portainer Documentation - CLI configuration options](https://docs.portainer.io/advanced/cli)
- [Portainer Documentation - Install Portainer CE on Docker Linux](https://docs.portainer.io/start/install-ce/server/docker/linux)
- [Portainer Documentation - Deprecated and removed features](https://docs.portainer.io/advanced/deprecated)
- [Portainer Release Notes - 2.33 LTS](https://docs.portainer.io/2.33-lts/release-notes)
- [Portainer source code - main.go](https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go)

## Issues Found

1. **Invalid `--ssl` flag**: The original post passed a `--ssl` flag to the Portainer container in both the `docker run` command and the Docker Compose `command:` array. This is not a valid Portainer CLI flag — the official Portainer CLI documentation lists only `--sslcert`, `--sslkey`, and `--sslcacert` (deprecated) under SSL options. In Portainer 2.x, HTTPS is enabled by default on port 9443, so no separate "enable SSL" toggle exists. Passing an unrecognized flag would cause the container to fail at startup. Removed `--ssl` from the `docker run` example, the Docker Compose `command:` block, and the prose sentence introducing the flags.

## Review Notes
- The `--sslcert` and `--sslkey` flags used in the post are still functional in current Portainer CE (and remain the example shown in Portainer's official `/advanced/ssl` documentation), but they were marked deprecated in Portainer 2.33.2 LTS in favor of `--tlscert` and `--tlskey`. The deprecated flags will be removed in a future release. Readers using newer versions may eventually need to migrate to `--tlscert`/`--tlskey`, but no change is required for current versions.
- The default certificate paths inside the container (`/certs/portainer.crt` and `/certs/portainer.key`) match Portainer's documented defaults, so a reader could even omit the explicit flags as long as the bind-mount lands at `/certs`.
- The ports (`9443` HTTPS UI, `8000` Edge tunnel), image name (`portainer/portainer-ce:latest`), volume mounts, file permissions (`644` cert / `600` key), and verification commands (`openssl s_client`, `curl -vk`) are all correct.
- The Docker Compose file uses `version: "3.8"`, which is harmless but no longer required — modern Compose ignores the top-level `version` key. Not changed since it is not technically incorrect.
