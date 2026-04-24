# Validation Summary: How to Set Up Service Webhooks in Portainer on Swarm

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Webhooks
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Docker CLI
- curl

## Sources Consulted
- Portainer service webhook docs: https://docs.portainer.io/user/docker/services/webhooks
- Portainer service creation docs: https://docs.portainer.io/user/docker/services/add
- Portainer source for service webhook execution: https://github.com/portainer/portainer/blob/develop/api/http/handler/webhooks/webhook_execute.go
- Portainer source for empty HTTP responses: https://github.com/portainer/portainer/blob/develop/pkg/libhttp/response/response.go
- Docker Swarm service update behavior: https://docs.docker.com/engine/swarm/services/
- GitHub `actions/checkout`: https://github.com/actions/checkout
- Docker `login-action`: https://github.com/docker/login-action
- Docker `build-push-action`: https://github.com/docker/build-push-action
- GitLab Docker-in-Docker docs: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab deprecated CI keywords: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- Jenkins Credentials Binding plugin docs: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Docker CLI docs for `docker login`: https://docs.docker.com/reference/cli/docker/login/
- Docker CLI docs for `docker image tag`: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker CLI docs for `docker image push`: https://docs.docker.com/reference/cli/docker/image/push/

## Issues Found
- The webhook test section expected `HTTP 200 OK`, but current Portainer source returns `204 No Content` through `response.Empty()`. I updated the expected response and made `--insecure` conditional instead of unconditional because it is only appropriate for self-signed certificates.
- The webhook behavior section described a conditional update based on digest changes and a separate **Force update** setting. Current Portainer service webhook execution always increments Swarm's `ForceUpdate` counter and performs a service update with registry querying enabled. I rewrote Step 6 and the **Force Update** subsection to match the actual implementation and Docker Swarm behavior.
- The GitHub Actions example used older action majors. I updated `actions/checkout`, `docker/login-action`, and `docker/build-push-action` to current non-deprecated major versions.
- The GitLab CI example used deprecated `only` syntax and omitted the documented Docker-in-Docker TLS configuration details. I replaced `only` with `rules`, pinned the Docker CLI and DinD images to the documented form, added `DOCKER_TLS_CERTDIR`, and noted the privileged runner requirement.
- The Jenkins example pushed an unnamespaced image and did not authenticate to a registry before pushing. I updated it to use Jenkins username/password credentials, log in with `--password-stdin`, and push fully qualified `myorg/myapp` tags.

## Review Notes
- Portainer's public docs explain service webhooks at a high level, but the most precise details for the response code and forced update behavior come from the current Portainer source.
- The GitHub Actions example still uses major-version tags for readability. GitHub recommends pinning third-party actions to a commit SHA for stronger supply-chain guarantees.
