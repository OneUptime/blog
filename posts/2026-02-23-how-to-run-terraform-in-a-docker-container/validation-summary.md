# Validation Summary: How to Run Terraform in a Docker Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- HashiCorp Terraform Docker image
- Docker CLI
- Docker Compose
- AWS, Azure, and Google Cloud credentials
- GitHub Actions
- GitLab CI

## Sources Consulted
- HashiCorp Terraform Docker image on Docker Hub: https://hub.docker.com/r/hashicorp/terraform/
- Terraform CLI `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform CLI configuration file and plugin cache documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Docker `run` documentation: https://docs.docker.com/engine/containers/run/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- GitHub Actions job container documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container
- GitLab CI Docker image documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- GitLab Runner Docker executor documentation: https://docs.gitlab.com/runner/executors/docker/

## Issues Found
- The Docker Compose example used `version: '3.8'`. Docker Compose now treats the top-level `version` property as obsolete and only informational. Removed the field so the snippet follows the current Compose Specification.
- The provider cache explanation said provider downloads disappear when the container is removed. With the article's mounted workspace pattern, `.terraform` persists on the host. Updated the text to explain that a shared plugin cache avoids re-downloads across projects or after cleaning `.terraform`.
- The GitHub Actions example used `hashicorp/terraform:1.7.5` as the job container and then ran `terraform` commands directly. Reworked the example to run Terraform through `docker run`, which matches the Docker-based approach and avoids the Terraform image entrypoint problem.
- The GitLab CI example used the Terraform image without overriding its `ENTRYPOINT`. GitLab Runner expects an image with no entrypoint or an entrypoint that starts a shell. Changed the image definitions to include `entrypoint: [""]`.
- The network troubleshooting command attempted to run `sh` through the Terraform image without overriding the image entrypoint, which Docker passes as an argument to `/bin/terraform`. Added `--entrypoint sh` so the shell command executes correctly.

## Review Notes
- Terraform `1.7.5` is valid and still available, but it is not the current Terraform release as of this review. The post intentionally demonstrates version pinning, so no version change was made.
- The corrected examples were checked with live Docker commands, `docker compose config`, YAML parsing, and a test build of the custom Dockerfile.
