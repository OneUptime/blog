# Validation Summary: How to Deploy Nginx Proxy Manager as a Portainer Stack - Npm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Nginx Proxy Manager
- Docker Compose
- MariaDB
- Docker Engine API

## Sources Consulted
- Nginx Proxy Manager setup instructions: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager advanced configuration: https://nginxproxymanager.com/advanced-config/
- Nginx Proxy Manager GitHub repository: https://github.com/NginxProxyManager/nginx-proxy-manager
- Nginx Proxy Manager latest release metadata: https://api.github.com/repos/NginxProxyManager/nginx-proxy-manager/releases/latest
- Portainer stack editing docs: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer API access docs: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 API spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Engine API exec reference: https://docs.docker.com/reference/api/engine/version/v1.24/

## Issues Found
- The post did not say the examples target a Docker Standalone environment in Portainer. The Compose examples use bridge networks, `container_name`, and container-level console behavior that are not appropriate for Docker Swarm stacks, so the prerequisites were clarified.
- The Nginx Proxy Manager healthcheck path was wrong. It used `/bin/check-health`; upstream NPM documentation uses `/usr/bin/check-health`, so the healthcheck snippet was corrected.
- The MariaDB example omitted `MARIADB_AUTO_UPGRADE: "1"`, which is present in NPM's official MariaDB example. It was added to match the upstream setup guidance.
- The Portainer stack management section described standalone stack contents as "Services". Portainer's standalone stack view is container-oriented, so the wording was corrected to "Containers" and the action descriptions were updated accordingly.
- The update example pinned NPM to `2.11.3`, which is outdated relative to the current upstream release as of April 24, 2026. It was updated to `2.14.0`.
- The Portainer API example incorrectly used `PUT /api/stacks/{id}/git/redeploy`, which is for Git-backed stacks. This post creates the stack in the Web Editor, so the example was replaced with the correct file-based stack update flow using `GET /api/stacks/{id}/file` and `PUT /api/stacks/{id}?endpointId=...`.
- The backup section incorrectly used `sqlite3` inside the NPM container even though the published NPM Dockerfile does not install the `sqlite3` CLI. The Portainer exec API example was also incomplete because Docker exec requires a follow-up start call. The section was replaced with accurate volume-level backup guidance for SQLite and MariaDB deployments.
- The conclusion said the `proxy` network should be created as an external resource, but the post's own stack definitions create that network inside the NPM stack with a fixed name. The wording was corrected to match the actual configuration shown.

## Review Notes
- The post is technically sound after correction, but the Portainer API example remains specific to stacks created in the Web Editor or uploaded directly. Git-backed stacks use different update and redeploy endpoints.
- The NPM upstream docs still use `latest` in example images, but pinning to a specific version is safer for reproducible deployments.
