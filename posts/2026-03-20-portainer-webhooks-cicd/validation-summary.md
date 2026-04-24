# Validation Summary: How to Use Portainer Webhooks in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Compose stacks
- Docker Swarm services
- Webhooks
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Nginx
- Bash

## Sources Consulted
- Portainer stack webhooks docs: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer service webhooks docs: https://docs.portainer.io/user/docker/services/webhooks
- GitHub Actions workflow syntax: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- `actions/checkout` README: https://github.com/actions/checkout
- `docker/build-push-action` README: https://github.com/docker/build-push-action
- `docker/login-action` README: https://github.com/docker/login-action
- `docker/setup-buildx-action` Marketplace page: https://github.com/marketplace/actions/docker-setup-buildx
- GitLab container registry build/push docs: https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- GitLab deprecated CI/CD keywords: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- Jenkins HTTP Request step reference: https://www.jenkins.io/doc/pipeline/steps/http_request/
- GitHub-hosted runners IP guidance: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- GitLab.com IP guidance for CI/CD runners: https://docs.gitlab.com/user/gitlab_com/

## Issues Found
- The post used the service webhook path for all webhook examples. I corrected the stack webhook path to `/api/stacks/webhooks/{uuid}` and kept `/api/webhooks/{uuid}` for Swarm services, matching the current Portainer docs.
- The stack webhook setup steps did not match the current Portainer UI and omitted important availability constraints. I updated the stack flow to use the **Editor** tab and **Create a stack webhook**, and noted that stack webhooks require Portainer Business Edition while Portainer webhooks are only available on non-Edge environments.
- The post hard-coded `204` in some webhook examples and `200` in others. Portainer’s current docs document the POST endpoints but do not define one fixed success code across the covered examples, so I changed the shell and CI snippets to accept any `2xx` response.
- The GitHub Actions example used older action versions and omitted registry authentication. I updated it to current action versions, added `docker/login-action`, added `docker/setup-buildx-action`, and set `context: .` so the example matches current official usage and can actually push an image.
- The GitLab CI example built and pushed an image without configuring Docker-in-Docker or authenticating to the registry, and it used deprecated `only`. I added the Docker CLI and DinD images, added registry login, and replaced `only` with `rules`.
- The Jenkins example referenced the webhook URL as a bare Groovy variable and accepted only HTTP `200`. I updated it to use Jenkins credentials binding plus `env.PORTAINER_WEBHOOK_URL`, and changed the accepted response range to `200:299` per the HTTP Request plugin docs.
- The Nginx proxy example only matched `/api/webhooks/`, which excludes stack webhooks, and it suggested allowlisting GitHub-hosted/GitLab.com runner IPs as if they were stable. I updated the location to cover both stack and service webhook paths and changed the guidance to static egress IPs that you control, such as self-hosted runners or internal CI servers.
- The conclusion overstated the security of the secret UUID alone. I changed it to say the webhook URL should be treated as a secret because the endpoint does not require separate authentication.

## Review Notes
- The proxy example still assumes an internal upstream of `http://portainer:9000`. If your Portainer instance is only exposed internally on `9443`, adjust `proxy_pass` to match your deployment.
- The health-check examples assume your application exposes a stable health endpoint that returns `200` when the new deployment is ready.
