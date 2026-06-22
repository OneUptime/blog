# Validation Summary: How to Set Up Docker with GitLab CI Runner

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab Runner
- GitLab CI/CD
- Docker executor
- Docker-in-Docker
- Docker socket binding
- Docker Compose
- GitLab CI cache configuration
- GitLab CI service containers
- S3 and Google Cloud Storage runner cache backends

## Sources Consulted
- GitLab Docs: Registering runners - https://docs.gitlab.com/runner/register/
- GitLab Docs: Migrating to the new runner registration workflow - https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Docs: Advanced GitLab Runner configuration - https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab Docs: Use Docker-in-Docker - https://docs.gitlab.com/ci/docker/docker_in_docker/
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Services - https://docs.gitlab.com/ci/services/
- GitLab Docs: Using PostgreSQL as a service - https://docs.gitlab.com/ci/services/postgres/
- GitLab Docs: Scripts and job logs - https://docs.gitlab.com/ci/yaml/script/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose interpolation - https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs: Compose variable interpolation - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/

## Issues Found
- Replaced legacy runner registration-token usage with runner authentication-token usage. GitLab registration tokens and several runner registration arguments are deprecated, and current examples should use `--token`.
- Removed `--tag-list`, `--run-untagged`, and `--locked` from the non-interactive registration example because these runner attributes belong in the current runner creation workflow rather than the registration command.
- Removed unused Docker Compose environment variables that implied the GitLab Runner container auto-registers or applies tags from passive environment variables.
- Removed invalid `tag_list` entries from `config.toml` runner examples. Runner tags are managed through GitLab runner creation/configuration, not as those TOML fields.
- Removed obsolete top-level `version: '3.8'` keys from Docker Compose examples.
- Removed `Type = "local"` from the local runner cache example. GitLab Runner distributed cache types are object-storage backends such as S3, GCS, and Azure; local Docker cache is configured with volumes/cache directory settings.
- Added `DOCKER_TLS_CERTDIR: "/certs"` to the production security scan job that connects to `tcp://docker:2376`, matching the TLS-enabled DinD setup.
- Converted wrapped `docker build`, `docker run`, and `curl` commands in `.gitlab-ci.yml` examples to folded block scalars so the YAML parses correctly and GitLab executes each as a single shell command.

## Review Notes
Validated the fenced YAML and TOML snippets with local parsers after edits. The examples remain intentionally generic and still require real runner authentication tokens, project registry variables, deployment endpoints, and service credentials in a live environment.
