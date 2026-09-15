# Validation Summary: Drone 'Insufficient Privileges': Check Repository Trust and Runner Security

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
- The advice to pin allowed images did not explain that `DRONE_RUNNER_PRIVILEGED_IMAGES` matches image repository names after stripping tags and digests. Clarified that an allowlist entry cannot enforce a particular image version; step image pins and administrator-controlled digest validation must enforce that restriction separately.

## Review Notes
- Verified against Docker runner commit `58f896ddd9292ecc8eb03ed93d1e1cdb23002c25`: [image matching and trimming](https://github.com/drone-runners/drone-runner-docker/blob/58f896ddd9292ecc8eb03ed93d1e1cdb23002c25/internal/docker/image/image.go#L14-L53) and the [privileged-image check](https://github.com/drone-runners/drone-runner-docker/blob/58f896ddd9292ecc8eb03ed93d1e1cdb23002c25/engine/compiler/compiler.go#L584-L593).

The quoted error is correctly identified as Drone 0.8-era wording, while the current documentation continues to require a trusted repository for an explicit privileged step. Exact validation messages and effective runner behavior remain deployment-version-specific, as the post notes. The example build command is intentionally project-specific and is not presented as a runnable command supplied by Drone.
