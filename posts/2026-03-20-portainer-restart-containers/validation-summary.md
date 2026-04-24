# Validation Summary: How to Restart Containers in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose
- Shell scripting (`bash` / `sh`)
- GitHub Actions webhooks usage

## Sources Consulted
- Docker Docs: `docker container restart` — https://docs.docker.com/reference/cli/docker/container/restart/
- Docker Docs: Deprecated features (`--time` renamed to `--timeout`) — https://docs.docker.com/engine/deprecated/#time-option-on-docker-stop-and-docker-restart
- Docker Docs: Start containers automatically / restart policies — https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: Dockerfile `HEALTHCHECK` reference — https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Docs: `docker container run` restart policy and `RestartCount` inspection examples — https://docs.docker.com/reference/cli/docker/container/run/
- Portainer Docs: View a container's details — https://docs.portainer.io/user/docker/containers/view
- Portainer Docs: Inspect a container — https://docs.portainer.io/user/docker/containers/inspect
- Portainer Docs: Edit or duplicate a container — https://docs.portainer.io/user/docker/containers/edit
- Portainer Docs: Advanced container settings / restart policy — https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs: Container webhooks — https://docs.portainer.io/user/docker/containers/webhooks
- Portainer Docs: Edge Jobs — https://docs.portainer.io/user/edge/jobs

## Issues Found
- The explanation of `docker restart` said Docker always sends `SIGTERM` and uses a universal 10-second grace period. I corrected this to reflect Docker's documented behavior: Docker uses the container's configured stop signal (default `SIGTERM` if unset) and the timeout can come from container configuration, with daemon defaults of 10 seconds for Linux containers and 30 seconds for Windows containers.
- The CLI example used `docker restart --time 30`. Docker documents `--time` as deprecated in favor of `--timeout`, so I updated the example to `docker restart --timeout 30`.
- The Portainer webhook section described the feature as a container "restart". Portainer's container webhook docs describe it as a redeploy flow, and note that it is only available in Portainer Business Edition on non-Edge environments. I updated the section title, description, and CI/CD example wording accordingly.
- The health-check section incorrectly claimed Docker would restart a container automatically when health checks failed in combination with a restart policy. Docker's docs say failed health checks mark the container `unhealthy`; restart policies act when the container process exits. I corrected the explanation and the inline comment in the Compose snippet.
- The monitoring section used `docker inspect ... | jq '.[].State'` while also telling readers to check `RestartCount`, but `RestartCount` is not inside `.State`. I replaced the example with a documented `docker inspect -f` command that prints `Status`, `RestartCount`, and `StartedAt`, and adjusted the Portainer note to point readers to the Inspect view.
- The Edge Jobs section implied general Edge-device availability. Portainer documents Edge Jobs as host-level jobs currently available on supported Docker Standalone Edge environments, so I tightened that wording.

## Review Notes
- The health check example uses `curl`, which assumes the container image includes `curl`. The syntax is correct, but readers may need to adapt the probe command for minimal images.
- Portainer Edge Jobs are documented as a beta feature and run on the underlying host via `cron`, not inside a container.
- No version numbers are pinned in the post, so the review was performed against current Docker and Portainer documentation as of 2026-04-24.
