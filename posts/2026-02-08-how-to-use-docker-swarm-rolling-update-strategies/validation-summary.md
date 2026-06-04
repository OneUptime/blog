# Validation Summary: How to Use Docker Swarm Rolling Update Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm services
- Docker service rolling updates and rollbacks
- Dockerfile health checks
- Docker Compose / stack deploy files
- npm dependency installation in a Node.js Docker image

## Sources Consulted
- Docker Docs: Apply rolling updates to a service - https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update CLI reference - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker service rollback CLI reference - https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Dockerfile HEALTHCHECK reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: docker stack deploy CLI reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: docker system events CLI reference - https://docs.docker.com/reference/cli/docker/system/events/
- npm Docs: npm ci command configuration - https://docs.npmjs.com/cli/v10/commands/npm-ci/
- Local Docker CLI help output from Docker 29.4.2 for `docker service create`, `docker service update`, `docker service rollback`, `docker service ps`, `docker service inspect`, `docker stack deploy`, and `docker events`.

## Issues Found
- The introduction claimed the guide covered every rolling update parameter, but the post did not include `--update-monitor`. Changed the wording to "key rolling update parameters" and added `--update-monitor` to the service examples, with a short explanation of what the monitor window does.
- The rolling update step list assumed `stop-first` behavior even though the examples use `start-first`. Updated the sequence to describe task replacement according to the configured order.
- The failure-action explanation implied any single failed task immediately triggers the configured action. Updated it to reflect Docker's documented `--update-max-failure-ratio` behavior.
- The `start-first` explanation said Swarm waits for the new task to become healthy before stopping the old one. Docker documents task update progression primarily in terms of the new task running and failures during the monitor window, so the wording was changed to "after the new task is running."
- The Dockerfile used `npm ci --only=production`, which is outdated compared with the current npm `omit` configuration. Changed it to `npm ci --omit=dev`.
- Added `monitor` fields to the Compose `deploy.update_config` and `deploy.rollback_config` examples to match the corrected Swarm CLI examples and the Compose Deploy Specification.

## Review Notes
- The examples use `docker stack deploy`, so the Compose `deploy` configuration is relevant for Swarm stack deployment. Future updates could mention that `deploy` behavior differs between Swarm stack deployment and plain `docker compose up`, but the current example is valid because it deploys with `docker stack deploy`.
