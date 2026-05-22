# Validation Summary: How to Run OpenTofu in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu OCI/Docker images
- Docker and Docker Compose
- Docker Swarm secrets
- AWS, Azure, and Google Cloud credentials
- GitHub Actions
- GitLab CI/CD
- Checkov
- TFLint

## Sources Consulted
- OpenTofu Docker installation documentation: https://opentofu.org/docs/intro/install/docker/
- OpenTofu 1.6 Docker image documentation: https://opentofu.org/docs/v1.6/intro/install/docker/
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI configuration and plugin cache documentation: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- Docker `run` documentation: https://docs.docker.com/engine/containers/run/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Swarm secrets documentation: https://docs.docker.com/engine/swarm/secrets/
- GitHub Actions container job documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container
- GitLab CI Docker image documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- GitLab job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/
- Google Cloud Application Default Credentials documentation: https://cloud.google.com/docs/authentication/application-default-credentials
- TFLint Docker image documentation: https://github.com/terraform-linters/tflint

## Issues Found
- The post recommended `ghcr.io/opentofu/opentofu:latest` as a directly runnable official OpenTofu image. Current OpenTofu documentation says direct use of official images is no longer supported starting with OpenTofu 1.10. I changed the section to pin the examples to the runnable 1.6.2 image and added the current-release caveat.
- The Docker Compose examples used `version: "3.8"`. Docker Compose now treats the top-level `version` property as obsolete and only informative, so I removed it from the Compose examples.
- The GitHub Actions example configured the OpenTofu CLI image as the job container. Because the image has `tofu` as its entrypoint and GitHub Actions does not support overriding `--entrypoint` in `jobs.<job_id>.container.options`, I changed the workflow to run OpenTofu through explicit `docker run` steps on `ubuntu-latest`.
- The GitLab CI example used the OpenTofu CLI image without overriding its entrypoint. GitLab Runner starts containers using the image entrypoint unless configured otherwise, so I changed the image definition to set `entrypoint: [""]`.
- The conclusion still advised starting with the official image without qualification. I updated it to distinguish pinned legacy runnable images from custom images for current OpenTofu releases.

## Review Notes
I verified that `ghcr.io/opentofu/opentofu:1.6.2` exists, has `/usr/local/bin/tofu` as its entrypoint, and runs `tofu version` successfully in Docker. The custom Dockerfile was not fully built because it installs multiple external tools, but the OpenTofu binary copy path matches the official OpenTofu Docker documentation.
