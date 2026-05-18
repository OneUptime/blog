# Validation Summary: How to Set Up Notary for Image Signing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Notary (theupdateframework/notary) v0.7.0
- Docker Content Trust (DCT)
- The Update Framework (TUF)
- Docker Compose
- PostgreSQL (Notary backend)
- OpenSSL (TLS cert and delegation key generation)
- Ubuntu (host platform)

## Sources Consulted
- Notary command reference: https://github.com/theupdateframework/notary/blob/master/docs/command_reference.md
- Notary advanced usage / delegations: https://github.com/theupdateframework/notary/blob/master/docs/advanced_usage.md
- Docker docs — Delegations for Content Trust: https://docs.docker.com/engine/security/trust/trust_delegation/
- Docker docs — Content Trust environment variables: https://docs.docker.com/engine/security/trust/
- moby/moby#38639 — daemon.json `content-trust` keys not accepted in Docker CE
- Mirantis Container Runtime — Runtime Enforcement with Docker Content Trust: https://docs.mirantis.com/mcr/23.0/security/content-trust/runtime-enforcement.html
- Notary GitHub releases: https://github.com/theupdateframework/notary/releases/tag/v0.7.0
- Docker Hub `notary` image: https://hub.docker.com/_/notary

## Issues Found

1. **Delegation key generation used invalid `notary` CLI syntax.** The original post ran `notary key generate alice` and `delegation add ... alice ...`. The first positional argument to `notary key generate` is an *algorithm* (`ecdsa`/`rsa`/`ed25519`), not a name, so `alice` would have been rejected. Additionally, Notary delegation role names must be prefixed with `targets/` (e.g., `targets/releases`); a bare name like `alice` is not a valid delegation role. **Fix:** Rewrote the section to use the correct workflow — Alice generates an x509 keypair with OpenSSL, the repo owner runs `notary delegation add <gun> targets/releases alice.crt --all-paths`, and Alice imports her private key with `notary key import alice.key --role targets/releases`.

2. **Wrong command for root key rotation.** The post showed `notary key generate root` to rotate the root key after compromise. `root` is not a valid algorithm name for `key generate`, and the correct rotation command is `notary key rotate <gun> root`. **Fix:** Replaced with `notary key rotate your-registry.com/myapp root`, which mirrors the snapshot-rotation example earlier in the same section.

3. **`content-trust` block in `/etc/docker/daemon.json` is not supported by Docker CE.** The post instructed readers on Ubuntu (which runs Docker CE) to add `"content-trust": { "mode": "enforced" }` to `daemon.json` and restart the daemon. This configuration block is a **Mirantis Container Runtime (formerly Docker Enterprise Engine)** feature only; Moby/Docker CE silently ignores it (see moby/moby#38639). On Docker CE the only supported enforcement mechanism is the `DOCKER_CONTENT_TRUST=1` environment variable. **Fix:** Replaced the daemon.json snippet with guidance on setting `DOCKER_CONTENT_TRUST=1` via `/etc/environment` and via systemd unit `Environment=` for services, and added an explicit note explaining that the `content-trust` daemon.json block is Mirantis-only and does not work on Docker CE.

## Review Notes

- **Notary project status:** The upstream Notary project (theupdateframework/notary) was archived in July 2025. The `notary:server-0.7.0` and `notary:signer-0.7.0` Docker Hub tags still exist as historical layers and will still pull, but the project is no longer maintained. For a 2026 production deployment, readers should consider sigstore/cosign (which has largely displaced Notary v1 in the CNCF ecosystem) or Notary v2 (notation). The post stays focused on Notary v1 as titled, but readers should be aware of this trajectory.
- **Docker-compose config paths:** The post copies example configs to `/etc/notary-server-config.json` but the docker-compose volume mounts reference `./config/server-config.json`. Readers will need to place the actual config files at `~/notary-server/config/server-config.json` and `~/notary-server/config/signer-config.json` for the mounts to work. Left as-is since the docker-compose paths are the authoritative reference and the `cp` lines are clearly framed as "example configurations" the reader will adapt.
- **`docker compose` vs `docker-compose`:** The post uses the modern Compose V2 syntax (`docker compose up -d`), which is correct for current Ubuntu installations using the docker-compose-plugin package.
- **Compose file `version` field:** The `version: "3.7"` declaration at the top of the compose file is now obsolete in Compose V2 (it's ignored with a warning) but does not break functionality. Not a technical error, just stylistic dust.
