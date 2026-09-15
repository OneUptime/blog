# Validation Summary: Drone Secrets Are Empty: Fix `from_secret`, Target Names, and Repository or Organization Scope

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Drone CI Docker pipelines
- Drone repository and organization secrets
- Drone secret extensions
- Drone CLI and local pipeline execution
- Docker plugin configuration
- YAML
- POSIX shell parameter expansion

## Sources Consulted

- [Drone repository secrets](https://docs.drone.io/secret/repository/)
- [Drone organization secrets](https://docs.drone.io/secret/organization/)
- [Drone substitution and escaping](https://docs.drone.io/pipeline/environment/substitution/)
- [Drone Docker pipeline steps](https://docs.drone.io/pipeline/docker/syntax/steps/)
- [Drone Docker plugin](https://plugins.drone.io/plugins/docker)
- [Drone secret extension](https://docs.drone.io/extensions/secret/)
- [Drone command-line runner](https://docs.drone.io/quickstart/cli/)
- [Drone `secret ls` CLI reference](https://docs.drone.io/cli/secret/drone-secret-ls/)
- [Drone `exec` CLI reference](https://docs.drone.io/cli/drone-exec/)

## Issues Found
No technical issues found.

## Review Notes
The examples intentionally use broad image tags (`alpine:3` and `plugins/docker`) for readability. The post correctly advises pinning an approved plugin image for production. Organization secrets are unavailable on Drone Cloud and require self-hosting; the post states this accurately.
