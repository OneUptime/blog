# Validation Summary: How to Override Stack Configuration for Different Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (stack management)
- Docker Compose (Compose Specification, override files, environment variable interpolation)
- Docker Swarm (`deploy.replicas`)
- Git (branch-based deployment workflow)
- PostgreSQL (image example)

## Sources Consulted
- Docker Compose: Merge multiple Compose files — https://docs.docker.com/compose/multiple-compose-files/merge/
- Docker Compose: Variable interpolation / `${VAR:-default}` syntax — https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose: Version and name (top-level `version` is informative/obsolete) — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose: `deploy` (Swarm-only behavior) — https://docs.docker.com/reference/compose-file/deploy/
- Portainer: Add a Stack (Git, additional paths, env vars, .env load) — https://docs.portainer.io/user/docker/stacks/add
- Docker Hub: postgres official image (postgres:16-alpine is a current valid tag) — https://hub.docker.com/_/postgres

## Issues Found
No technical issues found.

All Compose YAML examples are syntactically valid and use correct interpolation syntax (`${VAR:-default}`). Portainer's documented features match the post's claims:
- Per-stack environment variables (Method 1)
- Multiple Compose files via "Additional paths" (Method 2)
- Branch / Git reference selection (Method 3)
- Environment file loading via "Load variables from .env file" (Method 4)

## Review Notes
- The top-level `version: "3.8"` field is now considered obsolete in the current Compose Specification (it is informative and ignored by recent Compose versions). It is still accepted for backward compatibility, so leaving it in is not incorrect, but a future revision could drop it.
- `deploy.replicas` only takes effect when the stack is deployed to Docker Swarm; Portainer also supports standalone Docker, where `deploy` is silently ignored. The post does not call this out explicitly, but using both `restart` (standalone) and `deploy.replicas` (swarm) in the same file is common and safe.
- In Method 2, the dev override file's `database` service does not redefine `image` or `volumes`. Per Docker Compose merge rules, both are inherited from the base file — so `db-data:/var/lib/postgresql/data` and `postgres:16-alpine` remain in effect when files are layered. The inline comments ("Use the official image in dev (no volume backup needed)") are slightly misleading on this point but not technically incorrect, since the override is still adding ports on top of the inherited config.
- Method 4's illustrative `.env.production:` block uses indentation purely as a visual label for the file contents; real `.env` files contain `KEY=VALUE` lines without indentation. The block is rendered as `text` and labeled clearly, so it should not mislead a careful reader.
- The post is otherwise accurate and matches Portainer's current documented capabilities as of 2026-04-27.
