# Validation Summary: “Insufficient Privileges to Use Privileged Mode” in Drone: Trusted Repositories and Runner Security

## Status
validated

## Post Type
Troubleshooting and security configuration guide

## Technologies Covered

- Drone CI Docker pipelines
- Drone server repository trust settings and CLI
- Drone Docker runner restrictions and routing labels
- Docker privileged containers
- Docker Engine daemon socket security

## Sources Consulted

- [Drone 0.8: Error: Insufficient privileges](https://0-8-0.docs.drone.io/error-insufficient-privileges/)
- [Drone Docker pipeline: Steps and privileged mode](https://docs.drone.io/pipeline/docker/syntax/steps/#privileged-mode)
- [Drone server: Administrators](https://docs.drone.io/server/user/admin/)
- [Drone CLI: drone repo update](https://docs.drone.io/cli/repo/drone-repo-update/)
- [Drone Docker runner: DRONE_LIMIT_TRUSTED](https://docs.drone.io/runner/docker/configuration/reference/drone-limit-trusted/)
- [Drone Docker runner: DRONE_LIMIT_REPOS](https://docs.drone.io/runner/docker/configuration/reference/drone-limit-repos/)
- [Drone Docker runner: DRONE_RUNNER_LABELS](https://docs.drone.io/runner/docker/configuration/reference/drone-runner-labels/)
- [Drone Docker pipeline: Routing](https://docs.drone.io/pipeline/docker/syntax/routing/)
- [Drone Docker runner: DRONE_RUNNER_PRIVILEGED_IMAGES](https://docs.drone.io/runner/docker/configuration/reference/drone-runner-privileged-images/)
- [Drone Docker runner: DRONE_RUNNER_VOLUMES](https://docs.drone.io/runner/docker/configuration/reference/drone-runner-volumes/)
- [Docker Engine security](https://docs.docker.com/engine/security/)
- [Docker dockerd reference: daemon socket](https://docs.docker.com/reference/cli/dockerd/#daemon-socket-option)

## Issues Found
No technical issues found.

## Review Notes
The quoted error is correctly identified as Drone 0.8-era wording, while the current documentation continues to require a trusted repository for an explicit privileged step. Exact validation messages and effective runner behavior remain deployment-version-specific, as the post notes. The example build command is intentionally project-specific and is not presented as a runnable command supplied by Drone.
