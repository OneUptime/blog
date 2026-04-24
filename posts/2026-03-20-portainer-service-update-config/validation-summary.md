# Validation Summary: How to Set Up Service Update Configuration in Portainer on Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Swarm services
- Docker service update and rollback workflows
- Compose Deploy Specification (`deploy.update_config`)
- Container health checks

## Sources Consulted
- Docker service create CLI reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker service update CLI reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker service rollback CLI reference: https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker Swarm services guide: https://docs.docker.com/engine/swarm/services/
- Docker rolling update tutorial: https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Portainer services documentation: https://docs.portainer.io/user/docker/services
- Portainer configure service options documentation: https://docs.portainer.io/2.21/user/docker/services/configure
- Portainer rollback a service documentation: https://docs.portainer.io/sts/user/docker/services/rollback

## Issues Found
- The post listed the default `monitor` value as `0s`. Docker's current `docker service create` CLI reference documents the default `--update-monitor` value as `5s`, and Portainer's service update options map to the Docker service update settings. Updated the default value in the parameter table to `5s`.
- The `start-first` explanation said Docker waits for the new task to become healthy before stopping the old one. Docker's documentation describes `start-first` as starting the new task first so the tasks briefly overlap, while the rolling update tutorial says updates proceed when a task reaches `RUNNING`. Reworded the section and related comments to remove the unsupported "wait for healthy" claim.
- The CLI section described `docker service update --force` as re-pulling the same tag. Docker's Swarm services guide says a service image is only updated when `docker service update` is run with `--image`. Changed the comment to describe `--force` accurately as a rolling restart without changing the image.
- The paused-update section incorrectly used rollback as if it were the pause action and suggested pausing by manipulating node drain state. Docker's rolling update tutorial says a paused update is resumed with `docker service update <SERVICE>`, while rollback is a separate action. Replaced the commands with the correct resume and rollback flow.
- The Redis example comment referred to a "Redis cluster", but the example only defined multiple replicas of the plain `redis:7` image and did not configure Redis clustering. Reworded the comments to describe it generically as a stateful workload example instead of claiming cluster behavior.

## Review Notes
- Docker's documentation is internally inconsistent on `update-monitor` / `monitor` defaults: the Swarm services guide mentions `30s`, the Compose Deploy Specification lists `0s`, and the current CLI reference for `docker service create` lists `5s`. Because the post is about Portainer's service editor and Docker service update behavior, the CLI reference was treated as the authoritative source for the corrected default.
- The Compose snippets are syntactically valid YAML, but Docker itself is not installed in this workspace, so command behavior was verified against Docker's official documentation rather than local `docker ... --help` output.
