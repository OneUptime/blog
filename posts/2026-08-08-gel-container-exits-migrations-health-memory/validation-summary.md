# Validation Summary: Diagnose a Gel Container That Exits After Migrations

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Gel and the official `geldata/gel` container image
- EdgeQL schema migrations and the Gel CLI
- Docker Engine and Docker Compose
- Docker health checks, restart policies, signals, and container inspection
- Container and host memory diagnostics
- PostgreSQL as Gel's storage backend

## Sources Consulted

- Gel Docker deployment documentation — https://docs.geldata.com/reference/running/deployment/docker
- Gel server and Docker-image configuration — https://docs.geldata.com/reference/running/configuration
- Gel health and metrics HTTP API — https://docs.geldata.com/reference/running/http
- Gel deployment requirements — https://docs.geldata.com/reference/running/deployment
- Gel migrations reference — https://docs.geldata.com/reference/datamodel/migrations
- Gel schema migration guide — https://docs.geldata.com/resources/guides/migrations/guide
- `gel migrate` CLI reference — https://docs.geldata.com/reference/using/cli/gel_migrate
- `gel migration status` CLI reference — https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_status
- `gel migration log` CLI reference — https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_log
- Official Gel Docker entrypoint — https://github.com/geldata/gel-docker/blob/master/docker-entrypoint.sh
- Official Gel Docker entrypoint functions — https://github.com/geldata/gel-docker/blob/master/docker-entrypoint-funcs.sh
- Docker Compose service reference — https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order — https://docs.docker.com/compose/how-tos/startup-order/
- `docker compose ps` reference — https://docs.docker.com/reference/cli/docker/compose/ps/
- `docker compose logs` reference — https://docs.docker.com/reference/cli/docker/compose/logs/
- `docker compose config` reference — https://docs.docker.com/reference/cli/docker/compose/config/
- `docker inspect` reference — https://docs.docker.com/reference/cli/docker/inspect/
- `docker stats` reference — https://docs.docker.com/reference/cli/docker/container/stats/
- Docker exit-status filtering, including exit 137 — https://docs.docker.com/reference/cli/docker/container/ls/#filter-by-exit-signal
- Docker event history — https://docs.docker.com/reference/cli/docker/system/events/
- Docker memory constraints — https://docs.docker.com/engine/containers/resource_constraints/
- Docker restart policies — https://docs.docker.com/engine/containers/start-containers-automatically/

## Issues Found

1. **Docker state was described too broadly.** The post said Docker records only the final container state, but Docker also exposes bounded event history. The wording now states that `docker inspect` reports current or final state without identifying the initiating cause by itself.

2. **The stopped-container ID lookup omitted exited containers.** `docker compose ps -q gel` lists running containers by default and can return nothing for the exited container being diagnosed. It was changed to `docker compose ps -a -q gel`.

3. **The focused inspection command did not display health state.** The surrounding text said the command distinguishes lifecycle state from health, but its template omitted `.State.Health.Status`. A guarded health field was added so the command works both with and without a configured health check.

4. **The container's image ID was mislabeled as an image digest.** In container inspection, `.Image` is the local image ID, which is distinct from a registry manifest digest or `RepoDigests` value. The prose now calls it an image ID.

5. **Two listed migration failure causes actually skip automatic migrations.** An empty `/dbschema` mount or an image containing schema files without `/dbschema/migrations` makes the current official entrypoint skip migration application and continue to the final server; it does not itself abort startup. Those bullets were replaced with the accurate case of mounting a revision whose migration history conflicts with the database.

6. **An expected entrypoint shutdown could be mistaken for an external stop.** The official image starts and intentionally stops a temporary server during bootstrap or migration application. The shutdown guidance now tells readers to distinguish that temporary server from a graceful shutdown of the final long-running server.

7. **`docker stats --no-stream` was presented without its live-sampling limitation.** The command captures one instantaneous sample and does not recover historical or peak usage after a container exits. The post now says to collect live samples during a controlled reproduction and use termination state after exit.

8. **Memory limit and reservation sizing were conflated.** A hard limit should account for measured peaks, while a soft reservation should reflect the expected working set. The recommendation was corrected accordingly.

9. **The deployment-requirements link used a redirecting legacy path.** It was updated to the current canonical Gel documentation URL.

## Review Notes

- The remaining Docker, Compose, Gel CLI, environment-variable, health-endpoint, signal, restart-policy, and migration-history claims were verified as current and correct.
- `GEL_SERVER_BOOTSTRAP_ONLY` is enabled by any nonempty value in the current image, including the string `false`; unset the variable to disable bootstrap-only behavior.
- `GEL_SERVER_COMPILER_POOL_MODE` and `GEL_SERVER_COMPILER_POOL_SIZE` are current settings for the final server. The current image configures its temporary bootstrap/migration server separately, so these variables should not be assumed to control migration-phase compiler usage.
- No Gel version is pinned in the post. The review used the current Gel 7 CLI/image behavior and current official documentation, so image-entrypoint implementation details should be rechecked on a future major upgrade.
