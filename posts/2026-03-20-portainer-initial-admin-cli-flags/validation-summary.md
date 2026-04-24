# Validation Summary: How to Set Up the Initial Admin Account via CLI Flags

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker
- Docker Compose
- Docker Swarm
- Docker Secrets
- bcrypt password hashing
- curl / Portainer HTTP API

## Sources Consulted
- Portainer Documentation: CLI configuration options — https://docs.portainer.io/advanced/cli
- Portainer Documentation: Install Portainer CE with Docker on Linux — https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Documentation: Initial setup (CE) — https://docs.portainer.io/start/install-ce/server/setup
- Portainer Documentation: API usage examples — https://docs.portainer.io/sts/api/examples
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker stack deploy — https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Manage sensitive data with Docker secrets — https://docs.docker.com/engine/swarm/secrets/

## Issues Found
- The post originally claimed `--admin-password` could take a plain text password. Portainer's official CLI docs state that `--admin-password` requires a bcrypt hash, so I removed the invalid example and clarified the flag behavior.
- The prerequisites implied these flags could be used after Portainer data was already initialized. Portainer documents both `--admin-password` and `--admin-password-file` as first-run-only options, so I corrected that prerequisite.
- The standalone `docker run` examples did not publish Portainer's HTTPS port consistently, while the verification example used `https://localhost:9443`. I updated the examples to publish `9443:9443` so they match the documented default access pattern.
- The password file and Docker Secret examples used commands that add a trailing newline to the stored password. Portainer's own examples use newline-free file/secret content, so I changed these commands to write the password without a trailing newline.
- The Python bcrypt example omitted the required `bcrypt` package dependency. I added the installation step so the command is runnable as shown.
- The sample bcrypt hash was not a valid full bcrypt output. I replaced it with a valid example-format bcrypt hash from Portainer's documentation.
- The Docker Compose example used the obsolete top-level `version` field. I removed it to match current Compose guidance.
- The Swarm stack example exposed no ports, which would leave the Portainer UI unreachable. I added port publishing for `9443` and `8000`.
- The introduction and conclusion slightly overstated the effect of these flags by saying they skip the entire wizard. I narrowed that wording to the initial admin password creation step, which is what the Portainer docs explicitly document.

## Review Notes
- The post uses `portainer/portainer-ce:latest`. This is currently a valid image tag, but Portainer's installation docs generally show `:lts` or `:sts` tags, which are worth considering in production-focused content.
- The `--trusted-origins` example is technically valid but only needed when Portainer is behind a reverse proxy and you are addressing Origin validation errors.
