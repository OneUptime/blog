# Validation Summary: How to Build Docker Images in Jenkins Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins Declarative Pipeline
- Jenkins Docker Pipeline plugin
- Jenkins Pipeline credentials and shared libraries
- Docker Engine and Docker CLI
- Docker Compose
- Docker BuildKit
- Dockerfile multi-stage builds
- Amazon ECR authentication
- Trivy container scanning

## Sources Consulted
- Jenkins documentation: Using Docker with Pipeline - https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins documentation: Pipeline Syntax - https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins documentation: Docker Pipeline steps reference - https://www.jenkins.io/doc/pipeline/steps/docker-workflow/
- Jenkins plugin documentation: Amazon ECR plugin - https://plugins.jenkins.io/amazon-ecr/
- Docker documentation: Docker Compose overview and CLI behavior - https://docs.docker.com/compose/
- Docker documentation: Docker Compose install scenarios - https://docs.docker.com/compose/install/
- Docker documentation: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation: Docker build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker documentation: Build cache optimization and cache mounts - https://docs.docker.com/build/cache/optimize/
- Docker documentation: docker image prune - https://docs.docker.com/reference/cli/docker/image/prune/
- AWS CLI documentation: ecr get-login-password - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR documentation: Private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Local Docker CLI help for `docker build`, `docker compose`, `docker compose up`, `docker compose exec`, `docker compose down`, `docker login`, `docker push`, `docker rmi`, and `docker image prune`.

## Issues Found
- The Docker Compose examples used the legacy `docker-compose` standalone command. Updated the Jenkins shell snippets to use the current Docker Compose plugin command, `docker compose`, which is the current standard syntax in Docker documentation.
- The `docker-compose.jenkins.yml` snippet declared `version: '3.8'`. Removed the top-level `version` property because the Compose Specification keeps it only for backward compatibility and Docker documents it as obsolete.

## Review Notes
The Jenkins Docker Pipeline examples align with the documented `docker` agent, `docker.build()`, `docker.image(...).inside`, `docker.withRegistry`, and ECR credential provider patterns. The production pipeline assumes supporting Jenkins plugins and credentials are installed and configured, including Docker Pipeline, Workspace Cleanup, Slack notification support, AWS credentials binding where used, and Amazon ECR support for the ECR-specific `withRegistry` credential prefix.
