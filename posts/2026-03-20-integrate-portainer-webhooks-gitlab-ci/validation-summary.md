# Validation Summary: How to Integrate Portainer Webhooks with GitLab CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer container webhooks
- GitHub Actions
- GitLab CI/CD
- Docker image build and push workflows
- `curl` and HTTP webhooks

## Sources Consulted
- Portainer container webhooks: https://docs.portainer.io/2.33-lts/user/docker/containers/webhooks
- Portainer service webhooks and `SERVICE_TAG` environment-variable usage: https://docs.portainer.io/user/docker/services/webhooks
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions secrets usage: https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/using-secrets-in-github-actions
- Docker CLI `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- GitLab predefined CI/CD variables: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docker-in-Docker build guidance: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab container registry authentication: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab container registry build and push guidance: https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- GitLab deprecated CI/CD keywords: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab `rules` syntax: https://docs.gitlab.com/ci/jobs/job_rules/

## Issues Found
- The introduction described the workflow as "GitOps". Portainer's GitOps webhook/polling terminology is documented for stacks and applications deployed from Git, not for container webhooks, so I changed this to "automated deployment workflow".
- The post omitted that Portainer container webhooks are documented as a Portainer Business Edition feature on non-Edge environments. I added that constraint so readers are not misled about feature availability.
- The post used `SERVICE_TAG` terminology for a container webhook. For container webhooks, Portainer documents the `tag` query parameter; `SERVICE_TAG` is documented for service and stack webhook environment-variable substitution. I renamed the section and corrected the command comments accordingly.
- The GitHub Actions example tried to push an image without authenticating to a registry. I added a `docker login` step using secrets and `--password-stdin`, which is the documented non-interactive Docker login flow.
- The GitLab CI example used a hardcoded registry path, omitted registry authentication and Docker-in-Docker setup for the build job, and used deprecated `only:` syntax. I updated it to use `CI_REGISTRY_IMAGE`, added the documented registry login and Docker variables, and replaced `only:` with `rules:`.
- The GitLab deploy job assumed `curl` was already present in the job environment. I made the job self-contained by specifying an image and installing `curl` before the webhook call.

## Review Notes
- Portainer documents container webhooks at `/api/webhooks/<uuid>` and supports `?tag=<image-tag>` to redeploy a container with a different image tag.
- The GitLab build example assumes a runner configuration that supports Docker-in-Docker, which matches GitLab's documented Docker build workflow.
