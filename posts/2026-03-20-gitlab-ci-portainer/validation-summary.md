# Validation Summary: How to Set Up GitLab CI Pipelines That Deploy to Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Self-Managed
- GitLab Runner
- Docker
- Docker-in-Docker
- Portainer
- Portainer API
- Portainer stack webhooks
- Python
- pytest
- pytest-cov
- Safety CLI
- Bandit

## Sources Consulted
- GitLab Docs, Install GitLab in a Docker container: https://docs.gitlab.com/install/docker/installation/
- GitLab Docs, Use Docker to build Docker images: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs, Authenticate with the container registry: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab Docs, CI/CD caching examples: https://docs.gitlab.com/ci/caching/examples/
- Portainer Documentation, API documentation: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI 2.39.1: https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer Documentation, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation, Webhooks: https://docs.portainer.io/user/docker/services/webhooks
- Safety Documentation, GitLab integration: https://docs.safetycli.com/safety-docs/installation/securing-git-repositories/gitlab
- Safety Documentation, Available commands and inputs: https://docs.safetycli.com/safety-docs/safety-cli/scanning-for-vulnerable-and-malicious-packages/available-commands-and-inputs
- PyPI, pytest-base-url: https://pypi.org/project/pytest-base-url/
- Local CLI validation with `pytest --help` and a temporary `pytest-cov` run to confirm `--base-url` availability and coverage output behavior

## Issues Found
- The optional self-hosted GitLab Compose example had mismatched `external_url`, port mappings, and SSH settings. It was updated to use a consistent custom HTTP port and explicit Git SSH port configuration.
- The Docker-in-Docker pipeline example omitted `DOCKER_HOST`, which would make `docker` talk to the default local socket instead of the `docker:dind` service on a standard GitLab Runner setup. `DOCKER_HOST: tcp://docker:2375` was added and the runner requirement was clarified.
- The registry login command used `-p` directly. It was changed to `--password-stdin`, matching GitLab’s current guidance.
- The pip cache path was configured, but the jobs did not set `PIP_CACHE_DIR` into the project directory. That variable was added so the cache path is actually used.
- The unit test job defined a GitLab coverage regex but only emitted an XML coverage report. `--cov-report=term` was added so the regex can match real terminal output.
- The Safety example used `safety check`, which is deprecated in Safety CLI 3.x. It was updated to `safety --key "$SAFETY_API_KEY" --stage cicd scan`, and the required `SAFETY_API_KEY` variable was added.
- The integration test job used `pytest --base-url` without installing the plugin that provides that option. `pytest-base-url` was added to the job dependencies.
- The build job referenced `--cache-from ${IMAGE_BASE}:latest` without first pulling that image, which makes registry-backed cache reuse ineffective on a fresh runner. A `docker pull ... || true` step was added.
- The Portainer stack update examples were not valid for the current API. The request body used incorrect top-level JSON field names (`env`, `prune`, `pullImage`), omitted the required `StackFileContent` for file-based stack updates, and hard-coded `endpointId=1`. The examples were updated to fetch the current stack file first, then submit `StackFileContent`, `Env`, and `RepullImageAndRedeploy` with per-environment endpoint IDs.
- The post mixed file-based stack API updates and webhook-based Git stack redeploys without stating that they apply to different Portainer deployment modes. Step 3 was clarified as the file-based stack flow, and Step 4 was clarified as the Git-based webhook flow.
- The “View Deployment History in Portainer” wording overstated what Portainer provides in this workflow. It was adjusted to focus on deployment verification, and the rollback sentence was changed to describe redeploying a previous image tag.

## Review Notes
- The pipeline still uses `docker:24-alpine` and `docker:24-dind` major-version tags rather than fully pinned patch tags. That is workable, but pinning exact image tags would reduce future drift.
- The production workflow deploys from the `main` branch pipeline rather than promoting the exact artifact previously deployed to staging from `develop`. That is a workflow choice, not a syntax error, but teams that want stricter promotion semantics may want a single artifact-promotion path later.
