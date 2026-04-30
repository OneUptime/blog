# Validation Summary: How to Fix Tab Switching Causing Long Reloads in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine API
- Docker CLI
- Browser extensions / request interception

## Sources Consulted
- Portainer Account settings: https://docs.portainer.io/user/account-settings
- Portainer General settings: https://docs.portainer.io/admin/settings/general
- Portainer Connect to the Docker API: https://docs.portainer.io/admin/environments/add/docker/api
- Portainer Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer architecture: https://docs.portainer.io/start/architecture
- Portainer FAQ on Edge Agent recommendation: https://docs.portainer.io/sts/faqs/getting-started/why-do-we-recommend-using-the-edge-agent-instead-of-the-traditional-agent
- Portainer database encryption / BoltDB storage: https://docs.portainer.io/sts/advanced/db-encryption
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Docker Engine API SDK examples: https://docs.docker.com/reference/api/engine/sdk/examples/
- Docker prune documentation: https://docs.docker.com/engine/manage-resources/pruning/
- Docker `docker container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker `docker volume inspect` reference: https://docs.docker.com/reference/cli/docker/volume/inspect/
- Chrome `webRequest` API reference: https://developer.chrome.com/docs/extensions/reference/api/webRequest

## Issues Found
- The post described Portainer's UI as an Angular frontend that re-fetches Docker API data on every tab navigation. I removed the framework-specific claim and rewrote it as environment data refreshes that can translate into repeated Docker Engine API requests. Portainer's current docs do not document this behavior in Angular-specific terms, and the original wording risked being outdated.
- The Docker API timing step used a hard `1 second` threshold to classify the daemon as slow. I softened that to a qualitative check because Docker's official documentation does not publish a Portainer-specific latency cutoff for this request.
- The caching section pointed to `Settings > General` and mentioned a Docker-side "edge scheduling cache". I corrected this to Portainer's documented per-user `My account > Application settings > front-end data caching` setting for Kubernetes environments and noted that Portainer does not document an equivalent front-end caching setting for Docker environments.
- The stopped-container count command used `docker ps -a | wc -l`, which counts the header row. I changed it to `docker ps -aq | wc -l` so it counts containers only.
- The storage section claimed tab response times depend on BoltDB query speed and used a `/tmp` `dd` benchmark with an unsupported `>50MB/s` target. I replaced this with a documented `docker volume inspect` check for Portainer's default `portainer_data` volume and narrowed the claim so storage is presented as a secondary Portainer-side factor, not the primary cause of Docker view reload latency.
- The remote connectivity section recommended the classic Portainer Agent over direct Docker API access for performance. Current Portainer docs describe direct Docker API access as a legacy option and recommend the Edge Agent for most remote deployments, so I updated the guidance accordingly.
- The browser optimization section stated that extensions slow API calls. I rewrote this as a troubleshooting step grounded in browser extension request interception and modification behavior rather than as a blanket performance claim.

## Review Notes
- The post does not pin a Portainer version. The corrected guidance matches current Portainer documentation as of April 30, 2026; older releases may use slightly different menu labels.
- Portainer documents Kubernetes front-end caching explicitly, but it does not publish a detailed end-user explanation of every Docker view refresh path. The revised wording keeps that explanation at a documented, non-framework-specific level.
