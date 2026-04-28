# Validation Summary: How to Use Multi-Stage Builds and Deploy with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (multi-stage builds, Dockerfile syntax)
- Node.js (npm, alpine base image)
- Go (1.22, scratch base image, CGO_ENABLED, -trimpath)
- Docker Compose (v3.8, deploy/swarm directives, healthchecks)
- Portainer (stacks, webhooks)
- GitHub Actions (workflow YAML, actions/checkout@v4)
- BusyBox addgroup/adduser (Alpine)

## Sources Consulted
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference (FROM, COPY --from, --target): https://docs.docker.com/reference/dockerfile/
- npm install / ci documentation (deprecation of --only=production): https://docs.npmjs.com/cli/v10/commands/npm-ci and https://docs.npmjs.com/cli/v10/using-npm/config#omit
- Go build flags reference: https://pkg.go.dev/cmd/go
- Compose specification (deploy, healthcheck, restart_policy): https://docs.docker.com/reference/compose-file/
- Portainer stack webhooks documentation: https://docs.portainer.io/user/docker/stacks/webhooks
- GitHub Actions documentation: https://docs.github.com/en/actions
- Alpine BusyBox adduser/addgroup long-option support (verified `--system`, `--uid`, `--gid` work)
- Next.js official Docker example (matching addgroup/adduser pattern): https://github.com/vercel/next.js/tree/canary/examples/with-docker

## Issues Found
- **`npm ci --only=production` is deprecated.** The `--only` flag has been deprecated in npm since v7 in favor of `--omit=dev`. Replaced with `npm ci --omit=dev` in the Node.js dependency stage.

## Review Notes
- The `version: "3.8"` field at the top of the Compose file is now considered obsolete in Docker Compose v2 (it is parsed but ignored, and modern Compose emits a warning). It is not technically wrong and many tutorials still include it, so it was left alone — but readers using current Compose versions can safely omit it.
- The Compose file uses `deploy:` (replicas, update_config, restart_policy). These keys are honored only in Swarm mode (`docker stack deploy`) or by Portainer when deploying as a Swarm stack. In plain `docker compose up` they are ignored. Portainer can deploy stacks via either Compose or Swarm depending on the environment, so this is a reasonable example for Portainer users; just worth being aware of.
- The CI/CD example omits `docker login` before pushing to the registry. This was left as-is because it is a simplified illustrative snippet, but in practice an authentication step is required (e.g. `docker/login-action@v3`).
- The Alpine `addgroup --system --gid` / `adduser --system --uid` long-option form works on current Alpine releases (BusyBox 1.36+ supports the long aliases for `-S`, `-g`, `-u`). This matches the pattern used in the official Next.js Docker example.
- Go 1.22 is still supported but Go 1.23+ exists by April 2026; pinning to a specific minor version is recommended practice and is not an error.
- The healthcheck uses `wget`, which is present by default in `node:20-alpine`. If a reader switches to a `distroless` or `scratch` final stage, the healthcheck would need to be adjusted accordingly.
