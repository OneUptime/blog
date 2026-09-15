# Validation Summary: How to Upgrade Drone Server and Runners Without Stranding In-Flight Builds

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered

- Drone CI server
- Drone Docker runner
- Drone CLI
- Docker Engine and Docker CLI
- High-availability Drone deployments
- SQLite, PostgreSQL, and MySQL database persistence
- CI/CD build draining and upgrade procedures

## Sources Consulted

- Drone CLI: `drone build ls`: https://docs.drone.io/cli/build/drone-build-ls/
- Drone CLI: `drone build info`: https://docs.drone.io/cli/build/drone-build-info/
- Drone Docker runner capacity reference: https://docs.drone.io/runner/docker/configuration/reference/drone-runner-capacity/
- Drone Docker runner Linux installation and connectivity verification: https://docs.drone.io/runner/docker/installation/linux/
- Drone server database documentation: https://docs.drone.io/server/storage/database/
- Drone server high-availability overview: https://docs.drone.io/server/ha/overview/
- Drone Docker runner daemon source: https://github.com/drone-runners/drone-runner-docker/blob/master/command/daemon/daemon.go
- Drone shared runner poller source: https://github.com/drone/runner-go/blob/master/poller/poller.go
- Docker `container stop` reference: https://docs.docker.com/reference/cli/docker/container/stop/

## Issues Found
No technical issues found.

## Review Notes
The graceful-draining behavior is implementation-specific and version-sensitive. The post correctly tells operators to inspect the source revisions corresponding to their pinned runner image and to prove shutdown behavior in staging. The `docker stop --timeout=2100` example uses the current Docker CLI option and correctly identifies the value as illustrative. The Drone CLI examples match the documented command syntax, and the warning that `DRONE_RUNNER_CAPACITY` is configuration rather than a universal live drain API is appropriate.
