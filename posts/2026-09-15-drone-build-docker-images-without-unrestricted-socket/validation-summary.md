# Validation Summary: How to Build Docker Images in Drone Without Exposing an Unrestricted Docker Socket

## Status
validated

## Post Type
Security-focused CI/CD tutorial and deployment guide

## Technologies Covered
- Drone Docker runner and pipeline configuration
- Docker Engine and Unix socket security
- BuildKit (`buildkitd` and `buildctl`)
- Mutual TLS (mTLS)
- Docker registry authentication and image publishing
- Rootless BuildKit

## Sources Consulted
- Docker Engine security: https://docs.docker.com/engine/security/
- BuildKit README, including TCP/mTLS configuration, container deployment, image output, and registry authentication: https://github.com/moby/buildkit/blob/master/README.md
- BuildKit `buildctl` reference: https://github.com/moby/buildkit/blob/master/docs/reference/buildctl.md
- BuildKit rootless mode documentation: https://github.com/moby/buildkit/blob/master/docs/rootless.md
- BuildKit official Dockerfile, used to confirm the published image contains `/bin/sh` and `buildctl`: https://github.com/moby/buildkit/blob/master/Dockerfile
- Drone Docker pipeline steps and command execution: https://docs.drone.io/pipeline/docker/syntax/steps/
- Drone Docker runner configuration reference: https://docs.drone.io/runner/docker/configuration/reference/
- Drone `DRONE_RUNNER_VOLUMES` reference: https://docs.drone.io/runner/docker/configuration/reference/drone-runner-volumes/
- Drone pipeline substitution reference: https://docs.drone.io/pipeline/environment/substitution/

## Issues Found
- The credential list called the certificate supplied to `buildctl --tlscacert` the "client CA PEM." That flag identifies the CA used by the client to validate the BuildKit server certificate, which may differ from the CA used by the server to validate client certificates. Changed the wording to "the CA certificate PEM that validates the BuildKit server" to make the required trust direction explicit.

## Review Notes
- The `buildkitd` and `buildctl` TLS flags, TCP addresses, Dockerfile frontend inputs, registry image output syntax, and `DOCKER_CONFIG/config.json` behavior match current BuildKit documentation.
- The Drone pipeline structure, secret injection syntax, trigger syntax, and double-dollar runtime-variable escaping are consistent with Drone's documented behavior. Drone command steps override the image entrypoint, and the official BuildKit image supplies the shell and `buildctl` binary needed by the example.
- The security caveats are appropriately scoped: mTLS authenticates access to the builder but does not make untrusted Dockerfiles safe or provide repository-level authorization by itself.
- `moby/buildkit:latest` is intentionally illustrative; the post already advises pinning an approved release or digest for production use.
