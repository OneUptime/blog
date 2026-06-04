# Validation Summary: How to Use Docker BuildKit with Remote Workers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Buildx
- Docker BuildKit
- Remote BuildKit workers over SSH and TCP
- BuildKit TLS configuration
- Docker build contexts and `.dockerignore`
- Multi-platform Docker builds
- GitHub Actions CI

## Sources Consulted
- Docker Docs: Remote driver, https://docs.docker.com/build/builders/drivers/remote/
- Docker Docs: Docker container driver, https://docs.docker.com/build/builders/drivers/docker-container/
- Docker Docs: Build context, https://docs.docker.com/build/concepts/context/
- Docker Docs: buildkitd.toml, https://docs.docker.com/build/buildkit/toml-configuration/
- Moby BuildKit v0.13.0 buildkitd.toml reference, https://github.com/moby/buildkit/blob/v0.13.0/docs/buildkitd.toml.md
- Moby BuildKit v0.13.0 README, https://github.com/moby/buildkit/blob/v0.13.0/README.md
- Local Docker CLI help for `docker buildx create`, `docker buildx build`, `docker buildx du`, `docker buildx prune`, `docker buildx inspect`, and `docker buildx rm`
- Local OpenSSL CLI help for `openssl x509`

## Issues Found
- The TLS server certificate was generated with only a Common Name. Modern TLS clients require a subjectAltName for hostname verification, so the server CSR now includes `subjectAltName=DNS:build-server.example.com` and the signing command copies the extension into the certificate.
- The certificate commands wrote directly to `/etc/buildkit/certs` as an unprivileged user, and the later `scp` commands tried to read client keys from that privileged directory. The commands now generate certificates in `~/buildkit-certs`, install only the daemon certificates into `/etc/buildkit/certs` with `sudo install`, and copy client certificates from the user's home directory.
- The BuildKit TOML used `gckeepbytes`, which is not a valid BuildKit v0.13.0 worker option. It was changed to `gckeepstorage`, matching the pinned `moby/buildkit:v0.13.0` documentation.
- The BuildKit GC values were changed to documented string formats (`"20GB"`, `"50GB"`, and `"72h"`) for readability and compatibility with the versioned BuildKit reference.
- The GitHub Actions example created one remote builder but requested both `linux/amd64` and `linux/arm64`. Without a second ARM node or configured emulation, that can fail or misrepresent the native multi-architecture setup described earlier. The CI example now builds `linux/amd64` with the single remote node.
- The monitoring commands assumed a standalone container named `buildkitd`, which does not apply to the SSH-based Buildx builder. They now use `docker buildx du --builder remote-builder` and `docker buildx prune --builder remote-builder --reserved-space 20GB`, which target the configured builder directly.

## Review Notes
The post remains version-specific because it pins `moby/buildkit:v0.13.0`. That version's cache configuration keys differ from the current Docker documentation, which now documents newer disk-space fields such as `reservedSpace`, `maxUsedSpace`, and `minFreeSpace`.
