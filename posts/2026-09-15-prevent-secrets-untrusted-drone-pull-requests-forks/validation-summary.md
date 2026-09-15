# Validation Summary: How to Prevent Secrets from Reaching Untrusted Drone Pull Requests and Forks

## Status
validated

## Post Type
Security guide

## Technologies Covered

- Drone CI Docker pipelines
- Drone repository and organization secrets
- Drone external secret extensions and HashiCorp Vault
- Drone CLI repository settings
- Docker image publishing
- GitHub pull requests, forks, and branch protection
- Node.js and npm

## Sources Consulted

- Drone repository secrets: https://docs.drone.io/secret/repository/
- Drone organization secrets: https://docs.drone.io/secret/organization/
- Drone organization-secret CLI: https://docs.drone.io/cli/orgsecret/drone-orgsecret-add/
- Drone Vault integration: https://docs.drone.io/secret/external/vault/
- Drone secret extensions: https://docs.drone.io/extensions/secret/
- Drone Docker pipeline triggers: https://docs.drone.io/pipeline/docker/syntax/trigger/
- Drone Docker pipeline specification: https://docs.drone.io/yaml/docker/
- Drone repository-update CLI: https://docs.drone.io/cli/repo/drone-repo-update/
- Drone configuration signatures and Protected mode: https://docs.drone.io/signature/
- Drone Docker plugin: https://plugins.drone.io/plugins/docker

## Issues Found

- The organization-secret audit row implied that organization secrets could be restricted to selected repositories and arbitrary supported events. Drone documents organization secrets as available to every repository in the organization, with a specific option to allow or deny pull-request access. Changed the row to instruct readers to verify that the organization boundary is appropriate and that pull-request access remains disabled.

## Review Notes

- The two-pipeline YAML is valid Drone Docker pipeline configuration. Combined `push` and `main` triggers are conjunctive, so the publishing pipeline is limited as described.
- Drone documents repository and organization secrets as unavailable to pull requests by default, while its Vault extension makes secrets available to all repositories and build events unless filters are configured.
- The `--ignore-forks` and `--ignore-pull-requests` repository-update options are current.
- The Docker plugin reference is intentionally unversioned in the example, but the surrounding text correctly tells operators to pin it to a reviewed version appropriate to their environment.
