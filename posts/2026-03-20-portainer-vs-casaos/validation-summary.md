# Validation Summary: Portainer vs CasaOS: Home Server OS Comparison

## Status
validated

## Post Type
Guide / comparison

## Technologies Covered
- Portainer Community Edition
- CasaOS
- Docker
- Docker Swarm
- Kubernetes
- Docker Compose
- Self-hosted home servers

## Sources Consulted
- Portainer overview and edition details: https://docs.portainer.io/
- Portainer CE install on Docker for Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks
- Portainer access control documentation: https://docs.portainer.io/advanced/access-control
- Portainer Edge Agent documentation: https://docs.portainer.io/advanced/edge-agent
- CasaOS Wiki home: https://wiki.casaos.io/en/home
- CasaOS official repository and README: https://github.com/IceWhaleTech/CasaOS
- CasaOS AppStore repository: https://github.com/IceWhaleTech/CasaOS-AppStore
- CasaOS AppManagement repository: https://github.com/IceWhaleTech/CasaOS-AppManagement
- CasaOS UserService repository: https://github.com/IceWhaleTech/CasaOS-UserService

## Issues Found
- The original title framed the post as a "Home Server OS" comparison even though Portainer is a container management platform, not a server OS. I changed the title and description to position the article as a home server management comparison.
- The overview said Portainer provides a GUI, API, and CLI for managing workloads. Portainer's official docs describe a web UI and HTTP API, while the documented CLI material is for container startup flags rather than workload management. I corrected the overview accordingly.
- The CasaOS overview and feature table relied on placeholder entries such as `Varies`, which were not technically useful or verifiable. I replaced them with documented capabilities and limits, including Docker-based app management, no native Kubernetes support, single-host focus, Docker Compose-based app installs, and open source availability.
- The Portainer strengths section described Docker, Swarm, and Kubernetes as "container runtimes" and marked edge capabilities as BE-only. I changed this to supported environments and removed the unsupported BE-only qualifier from edge management.
- The Portainer deployment example used `portainer/portainer-ce:latest`, omitted the documented `docker volume create portainer_data` step, and did not reflect Portainer's current default port guidance. I updated the snippet to the current official Docker install flow and noted that port `9000` is only for legacy HTTP access.
- The CasaOS deployment snippet used a placeholder URL that would not work. I replaced it with the official installer command `curl -fsSL https://get.casaos.io | sudo bash`.
- The migration and community/support sections contained vague or mismatched claims. I updated them to fit the products' documented roles, support channels, and deployment models.

## Review Notes
- Portainer's current Linux Docker install page uses the `portainer/portainer-ce:sts` image tag as of April 24, 2026. Users who prefer longer support windows should also review Portainer's lifecycle guidance before pinning tags.
- Portainer documents port `9000` as a legacy HTTP port; `9443` is the default UI endpoint and `8000` is used for Edge Agent tunnel traffic.
- CasaOS's official README currently lists Debian 12, Ubuntu Server 20.04, and Raspberry Pi OS as officially supported/tested base systems. Other distributions may work, but they are not documented as the primary support targets in the sources consulted.
