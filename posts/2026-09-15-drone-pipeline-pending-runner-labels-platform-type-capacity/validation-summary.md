# Validation Summary: Drone Pipelines Pending: Check Runner Labels, Platform, Type, and Capacity

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Drone CI/CD
- Drone Docker runner
- Docker CLI
- YAML pipeline configuration
- Docker runner environment-variable configuration
- Linux and CPU architecture routing

## Sources Consulted
- Drone Docker runner installation: https://docs.drone.io/runner/docker/installation/linux/
- Drone Docker pipeline platform syntax: https://docs.drone.io/pipeline/docker/syntax/platform/
- Drone Docker pipeline routing syntax: https://docs.drone.io/pipeline/docker/syntax/routing/
- Drone `DRONE_RUNNER_LABELS` reference: https://docs.drone.io/runner/docker/configuration/reference/drone-runner-labels/
- Drone `DRONE_LIMIT_REPOS` reference: https://docs.drone.io/runner/docker/configuration/reference/drone-limit-repos/
- Drone `DRONE_LIMIT_TRUSTED` reference: https://docs.drone.io/runner/docker/configuration/reference/drone-limit-trusted/
- Drone `DRONE_RUNNER_CAPACITY` reference: https://docs.drone.io/runner/docker/configuration/reference/drone-runner-capacity/
- Docker `docker container logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/

## Issues Found
No technical issues found.

## Review Notes
- The Drone documentation currently describes the routing section as `nodes` in prose but uses the singular `node` YAML key in its example; the post accurately calls out this discrepancy and uses the documented key.
- The platform default, runner-label matching direction, repository restrictions, and default capacity of two concurrent pipelines were all confirmed against the current official Drone documentation.
- The example uses the floating `alpine:3` major-version tag. It is valid for the diagnostic shown, though pinning an image digest would offer stronger reproducibility if that becomes a future requirement.
