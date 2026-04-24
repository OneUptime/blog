# Validation Summary: How to Integrate Portainer Webhooks with GitLab CI - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer webhooks
- GitLab CI/CD
- GitLab Container Registry
- Docker
- Slack incoming webhooks
- YAML
- Shell scripting

## Sources Consulted
- Portainer stack webhooks documentation: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer service webhooks documentation: https://docs.portainer.io/user/docker/services/webhooks
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab deprecated CI/CD keywords reference: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab Docker build documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- Docker `docker login` CLI reference: https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The prerequisites were missing an operational requirement for `docker:dind`. I added a GitLab Runner prerequisite noting that Docker-in-Docker requires runner support and privileged mode.
- The Docker registry login examples used `docker login -p`. I changed both build jobs to `--password-stdin`, which is the current Docker-documented non-interactive pattern.
- The deploy jobs built commit/tag-specific images but triggered bare Portainer webhook URLs. Portainer documents `?tag=<tag>` for redeploying a different image tag, so I updated staging and production webhook calls to pass the built tag explicitly.
- The basic pipeline did not publish a semver tag image for release-tag pipelines, even though production deployment was based on release tags. I added conditional tagging and pushing of `$CI_COMMIT_TAG` in the basic build job.
- The rollback example was not a real rollback. Re-posting the same webhook URL just redeploys the currently configured tag, and `environment: action: stop` only affects the GitLab environment state. I changed the example to require `ROLLBACK_TAG`, call the Portainer webhook with `?tag=${ROLLBACK_TAG}`, and removed the incorrect stop action.
- The full pipeline used deprecated `only` syntax. I replaced those conditions with `rules`, matching current GitLab guidance.
- The tag-pipeline success/failure notification examples were slightly inaccurate. After moving production deploy control to `rules: when: manual`, the success notification now aligns with a real manual production deploy, and the failure notification text was corrected from “Deployment FAILED” to “Pipeline FAILED”.

## Review Notes
- The examples remain valid, but they still use floating container image tags like `docker:24` and `alpine:latest`. Pinning exact image versions or digests would make the pipeline more reproducible.
