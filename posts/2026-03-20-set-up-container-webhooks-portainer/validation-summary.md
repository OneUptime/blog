# Validation Summary: How to Set Up Container Webhooks in Portainer - Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer Docker container webhooks
- Docker image build and push commands
- curl webhook requests
- GitHub Actions
- GitLab CI/CD
- CI/CD secrets

## Sources Consulted
- Portainer documentation: Docker container webhooks - https://docs.portainer.io/user/docker/containers/webhooks
- Portainer documentation: Docker service webhooks and SERVICE_TAG environment variable examples - https://docs.portainer.io/user/docker/services/webhooks
- Portainer documentation: Docker stack webhooks and webhook environment variables - https://docs.portainer.io/user/docker/stacks/webhooks
- Docker CLI reference: docker image build - https://docs.docker.com/reference/cli/docker/image/build/
- Docker CLI reference: docker image push - https://docs.docker.com/reference/cli/docker/image/push/
- GitHub Actions workflow syntax - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/

## Issues Found
- The post implied container webhooks were generally available in Portainer. Current Portainer documentation states Docker container webhooks are a Portainer Business Edition feature and are only available on non-Edge environments. Added that availability caveat to the introduction.
- The introduction described the CI/CD webhook flow as a complete GitOps workflow. Container webhooks trigger redeployment; they are not the same as GitOps reconciliation from declarative Git state. Changed the wording to "automated deployment workflow."
- The setup steps referred to a "Container webhooks" section. Portainer's documentation labels this as the "Container webhook" option on the container details screen. Updated the wording.
- The first curl example used an unquoted URL containing the placeholder `<webhook-uuid>`, which a shell can interpret as input redirection. Quoted the URL.
- The post described the `?tag=` query parameter as "SERVICE_TAG" usage. Portainer documents `?tag=<value>` as the container webhook mechanism for updating the container image tag; `SERVICE_TAG` is an environment-variable convention documented for service/stack compose-file workflows. Updated the comment and section heading to use `tag` query parameter terminology.

## Review Notes
The curl commands use valid `POST`, `-s`, and `--fail` options, verified against local curl 8.5.0. The Docker commands and CI YAML snippets are syntactically valid, but real CI pipelines still need registry authentication configured before `docker push` will succeed. The OneUptime link returned HTTP 200 when checked on 2026-04-22.
