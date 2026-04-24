# Validation Summary: How to Use Portainer for DevOps Training

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Portainer Business Edition webhooks
- Docker Engine
- Docker Compose / Compose Specification
- Docker Swarm
- GitHub Actions
- Node.js
- PostgreSQL
- NGINX
- Prometheus
- Grafana
- cAdvisor

## Sources Consulted
- Portainer CE install on Docker for Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer stack webhooks: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer stack deployment and Git repository options: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer automatic updates FAQ: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Docker Engine install on Ubuntu and convenience script notes: https://docs.docker.com/installation/ubuntulinux/
- Docker Compose file reference and obsolete `version` field: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`devices`, `privileged`): https://docs.docker.com/reference/compose-file/services/
- Docker `service create` / `service update` and rolling updates: https://docs.docker.com/reference/cli/docker/service/create/ , https://docs.docker.com/reference/cli/docker/service/update/ , https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
- Docker container run and memory constraints: https://docs.docker.com/reference/cli/docker/container/run and https://docs.docker.com/engine/containers/resource_constraints/
- GitHub-hosted runners and current Actions examples: https://docs.github.com/actions/reference/runners/github-hosted-runners and https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/metadata-syntax
- Node.js release schedule and EOL policy: https://nodejs.org/en/about/releases/ and https://nodejs.org/en/about/eol
- Docker Official Node image tags: https://hub.docker.com/_/node/
- Prometheus Docker installation and health endpoint: https://prometheus.io/docs/prometheus/latest/installation/ and https://prometheus.io/docs/prometheus/latest/management_api/
- Grafana Docker configuration: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/ and https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- cAdvisor upstream quick-start: https://github.com/google/cadvisor

## Issues Found
- The VM bootstrap script installed Docker without `sudo`, added the wrong user to the `docker` group in some `sudo` scenarios, and then tried to use `docker` immediately before new group membership could apply. I updated the script to resolve the trainee user correctly, run the Docker install with `sudo`, use `sudo docker` for the Portainer setup step, and align the Portainer image tag with the current official install docs.
- Both Compose snippets used the obsolete top-level `version` field. I removed it to match the current Compose Specification.
- The application and incident examples used `node:18-alpine`, but Node.js 18 reached end-of-life on March 27, 2025. I updated both to `node:24-alpine`, which is a current supported LTS line and an official supported Docker tag.
- The GitHub Actions workflow used `actions/checkout@v3`, an outdated major version in 2026. I updated it to `actions/checkout@v5` to match current GitHub documentation examples.
- The Portainer webhook example used the wrong endpoint path (`/api/webhooks/...`) for stack webhooks, and the surrounding text implied the workflow applied generically to Portainer CE. I corrected the path to `/api/stacks/webhooks/...`, added `curl` flags that work with Portainer's default self-signed HTTPS setup in training environments, and clarified that webhook-based redeployments require Portainer Business Edition while CE users should use Git-based auto-updates instead.
- The monitoring stack used the old `gcr.io/cadvisor/cadvisor:latest` image pattern and omitted runtime settings from the current upstream cAdvisor quick-start. I updated the image to `ghcr.io/google/cadvisor:v0.55.1` and added the required privileged/device/volume mappings used in current official guidance.
- The incident simulation command had invalid shell syntax because the inline comment appeared after a line-continuation backslash. I moved the note to its own line so the command is valid shell.
- The assessment script checked Portainer over HTTPS without accounting for Portainer's default self-signed certificate. I changed the health check to use `curl -k` so it works with the training setup shown earlier in the post.

## Review Notes
- The GitHub Actions deployment example still assumes `PORTAINER_URL` is reachable from the runner. In many classroom setups that means exposing the training VM publicly or using a self-hosted runner.
- If a trainee runs the provisioning script interactively and then wants to use `docker` without `sudo` in the same shell, they will still need a new login session for the `docker` group membership to take effect.
- The post still uses pinned NGINX image tags for reproducibility; those tags should be refreshed periodically as upstream images age.
