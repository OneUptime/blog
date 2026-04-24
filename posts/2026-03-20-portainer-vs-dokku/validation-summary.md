# Validation Summary: Portainer vs Dokku: PaaS Comparison for Self-Hosters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Dokku
- Docker
- Docker Swarm
- Kubernetes
- K3s
- Docker Compose
- Git-based deployment
- Buildpacks

## Sources Consulted
- Portainer documentation home / product overview: https://docs.portainer.io/
- Portainer CE install on Docker Standalone (Linux): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer environment management: https://docs.portainer.io/admin/environments/add
- Portainer groups and access management: https://docs.portainer.io/admin/environments/groups
- Portainer Business Edition roles / RBAC: https://docs.portainer.io/sts/admin/user/roles
- Portainer stacks / Compose deployment: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Dokku installation guide: https://dokku.com/docs/getting-started/installation/
- Dokku application deployment: https://dokku.com/docs/deployment/application-deployment/
- Dokku Dockerfile deployment: https://dokku.com/docs/deployment/builders/dockerfiles/
- Dokku user management: https://dokku.com/docs/deployment/user-management/
- Dokku docker-local scheduler: https://dokku.com/docs/deployment/schedulers/docker-local/
- Dokku k3s scheduler: https://dokku.com/docs/deployment/schedulers/k3s/
- Dokku plugin system and plugin management: https://dokku.com/docs/community/plugins/ and https://dokku.com/docs/advanced-usage/plugin-management/
- Dokku Pro overview: https://pro.dokku.com/docs/getting-started/
- Official Portainer repository: https://github.com/portainer/portainer
- Official Dokku repository: https://github.com/dokku/dokku

## Issues Found
- The original title and opening framing treated Portainer and Dokku as if they were the same type of product. I corrected this to a deployment-platform comparison because Dokku is a PaaS while Portainer is primarily a container management platform.
- The Portainer overview incorrectly said Portainer provides a CLI for workload management. I changed this to a web UI and HTTP API, which matches the official Portainer documentation.
- The Dokku overview and strengths section were mostly placeholders. I replaced them with documented capabilities: `git push` deployment, buildpack and Dockerfile support, plugin-based extensibility, single-server operation by default, and optional k3s scheduling.
- The feature comparison table used multiple `Varies` placeholders where the products have concrete documented behavior. I replaced those cells with accurate entries, including Dokku's lack of a built-in web UI in core, SSH-key-based user management, default single-server model, and optional k3s-based Kubernetes support.
- The Portainer strengths section described Docker, Swarm, and Kubernetes as "container runtimes". I corrected this to "container environments" because Swarm and Kubernetes are orchestration environments, not runtimes.
- The Portainer selection criteria included a vague CI/CD claim. I replaced it with documented API-driven automation and Git-based stack deployment.
- The Portainer deployment command was not aligned with the current official install instructions. I updated it to create the persistent volume first, expose the documented ports `8000` and `9443`, and use the supported `portainer/portainer-ce:sts` image tag instead of `latest`.
- The Dokku deployment snippet used a fake placeholder URL. I replaced it with the current official bootstrap commands from the Dokku installation guide.
- The migration section assumed Dokku uses stacks and built-in user access controls in the same way Portainer does. I rewrote both migration lists so they refer to apps, Compose files, environment variables, domains, plugins, and Dokku's SSH-key-based access model.
- The community/support table also used unsupported placeholders. I replaced them with accurate descriptions based on the official docs and project repositories.
- The conclusion referred to both tools as part of the "container management ecosystem". I corrected this to reflect that they overlap in self-hosted application deployment, but solve different problems.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- Dokku installation commands are version-specific in the official documentation. The post now uses the current stable version shown in the docs on April 24, 2026: `v0.37.9`.
- Portainer's current official Docker installation docs use the `portainer/portainer-ce:sts` image tag and document port `9000` as legacy HTTP only. The post now reflects that guidance.
- Dokku core does not ship with a built-in web UI; the web UI referenced in official materials is Dokku Pro.
