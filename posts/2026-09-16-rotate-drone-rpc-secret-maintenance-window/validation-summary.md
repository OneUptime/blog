# Validation Summary: Rotate Drone RPC Secrets Across Servers and Runners in a Maintenance Window

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Drone CI server
- Drone runners (Docker, Kubernetes, and exec)
- Drone CLI
- Docker
- Kubernetes Secrets
- OpenSSL
- Shell configuration and secret management

## Sources Consulted
- Drone server `DRONE_RPC_SECRET` reference: https://docs.drone.io/server/reference/drone-rpc-secret/
- Drone Docker runner `DRONE_RPC_SECRET` reference: https://docs.drone.io/runner/docker/configuration/reference/drone-rpc-secret/
- Drone Docker runner installation and connection verification: https://docs.drone.io/runner/docker/installation/linux/
- Official Drone CLI source, including the queue pause and resume commands: https://github.com/harness/drone-cli/tree/master/drone/queue
- Docker `docker container stop` reference: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker environment-file reference: https://docs.docker.com/reference/cli/docker/container/run/#env
- Kubernetes documentation for injecting Secrets as environment variables: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- OpenSSL `rand` command documentation: https://docs.openssl.org/3.3/man1/openssl-rand/

## Issues Found
No technical issues found.

## Review Notes
The guide appropriately treats queue pausing and graceful runner shutdown as deployment- and version-dependent operations that must be tested. The Drone CLI currently includes `drone queue pause` and `drone queue resume`, but operators should retain the post's version-specific caution. The secret-generation command produces 32 random bytes encoded as 64 hexadecimal characters. Docker's timeout is measured in seconds, so `2100` correctly represents 35 minutes. Kubernetes Secret values injected through environment variables require container restart or replacement before an updated value is visible.
