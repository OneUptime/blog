# Validation Summary: How to Set Up CI/CD with Portainer and GitLab CI - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- GitLab CI/CD
- Docker
- Docker-in-Docker
- GitLab Container Registry
- curl
- jq
- YAML

## Sources Consulted
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Predefined CI/CD variables - https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docs: Pass dotenv variables to specific jobs - https://docs.gitlab.com/ci/variables/dotenv_variables/
- GitLab Docs: Deprecated keywords - https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab Docs: Specify when jobs run with rules - https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer API OpenAPI spec (CE 2.39.1) - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Docs: Webhooks - https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer Docs: Account settings - https://docs.portainer.io/user/account-settings

## Issues Found
- The GitLab CI examples used the deprecated `only` keyword. I replaced those conditions with `rules`, which is the current GitLab syntax.
- The Docker-in-Docker example was missing the Docker client connection variables GitLab documents for `docker:dind`. I added `DOCKER_HOST`, `DOCKER_TLS_VERIFY`, and `DOCKER_CERT_PATH`, and clarified the runner prerequisites for privileged mode and TLS certificate sharing.
- The webhook deployment job claimed it was deploying `$IMAGE_TAG`, but the shown webhook call only triggers a stack redeploy. I corrected the wording so it no longer implies a tag-specific deployment.
- The Portainer API-based deployment example did not say that `PUT /api/stacks/{id}` applies to file-based stacks and that the compose file must reference `${IMAGE_TAG}`. I clarified that assumption.
- The Portainer API payload examples used lowercase stack update fields and the deprecated `PullImage` field. I updated them to match the documented payload shape and switched to `RepullImageAndRedeploy`.
- The multi-environment example used `POST` to update an existing stack. I changed it to `PUT`, which is the documented update method.
- The multi-environment section text said "feature branches" while the YAML actually targeted `develop`. I corrected the prose to match the configuration.
- The conclusion described Portainer as handling container orchestration. I adjusted that wording to stack deployment and environment management to better reflect Portainer's role.

## Review Notes
- The examples still use floating image tags such as `docker:24` and `curlimages/curl:latest`. They are valid, but pinning exact image versions would make the guide more reproducible.
- `verify-deployment` depends on `deploy-production`, so the health check runs only after the manual production deployment job is started on the default branch.
