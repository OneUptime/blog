# Validation Summary: Roll Back Drone Deployments Using Rollback Events and Original Build Metadata

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone CI
- Drone CLI
- Docker pipelines and immutable container image digests
- CI/CD rollback and deployment controls
- YAML and JSON

## Sources Consulted
- Drone CLI rollback implementation: https://github.com/harness/drone-cli/blob/master/drone/build/build_rollback.go
- Drone server rollback handler: https://github.com/harness/harness/blob/drone/handler/api/repos/builds/rollback.go
- Drone Docker pipeline trigger documentation: https://docs.drone.io/pipeline/docker/syntax/trigger/
- Drone `DRONE_BUILD_PARENT` environment reference: https://docs.drone.io/pipeline/environment/reference/drone-build-parent/
- Drone `DRONE_DEPLOY_TO` environment reference: https://docs.drone.io/pipeline/environment/reference/drone-deploy-to/
- Drone Docker pipeline schema reference (including concurrency): https://docs.drone.io/yaml/docker/

## Issues Found
No technical issues found.

## Review Notes
- Rollback support is distribution-specific. The referenced server handler is guarded by a `!oss` build constraint, so the post's instruction to confirm feature availability and match behavior to the installed server revision is important.
- The CLI's positional interface is correctly shown as repository, build number, and environment. The server handler uses the selected build number as `Parent`, copies its commit-related hook metadata, sets the event to `rollback`, and applies the requested deployment target.
- The YAML trigger syntax for `rollback` plus `target` is valid. Drone documents target filtering as applicable specifically to promotion and rollback events.
- The manifest and deployment program are explicitly presented as application-owned patterns rather than built-in Drone features, and the illustrative digest has the correct `sha256` shape.
