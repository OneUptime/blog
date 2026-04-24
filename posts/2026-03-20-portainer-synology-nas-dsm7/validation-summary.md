# Validation Summary: How to Install Portainer on Synology NAS (DSM 7)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Synology DSM 7
- Synology Container Manager / Docker package
- Portainer Community Edition
- Docker CLI
- SSH
- TLS/SSL certificate configuration

## Sources Consulted
- Portainer CE install docs for Docker Standalone (Linux): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer update docs for Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer custom SSL certificate docs: https://docs.portainer.io/advanced/ssl
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Portainer app templates docs: https://docs.portainer.io/advanced/app-templates
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Synology DSM 7.2 feature page: https://www.synology.com/en-global/DSM72
- Synology Container Manager feature page: https://www.synology.com/en-global/dsm/feature/container-manager
- Synology SSH/Terminal help article: https://kb.synology.com/api/v1/findHelpFile/dsm/dsm/6.0/enu/6.0-7321/synology_armada370_ds115j/100/AdminCenter/system_terminal.html
- Synology NAS User's Guide for DSM 7.2: https://global.download.synology.com/download/Document/Software/UserGuide/Os/DSM/7.2/enu/Syno_UsersGuide_NAServer_7_2_enu.pdf

## Issues Found
- The post treated Container Manager as if it applied to all DSM 7 releases. Synology documents Container Manager as the DSM 7.2 rename of Docker, so I clarified that DSM 7.0/7.1 still use the Docker package.
- The post used `portainer/portainer-ce:latest` and treated port `9000` as a standard primary access port. Current Portainer docs document `:lts`/`:sts` release tags and `9443` as the default HTTPS UI port, with `9000` retained only for legacy HTTP access. I updated the install, access, firewall, and update sections accordingly.
- The SSH example used `ssh admin@<synology-ip>`. Synology documents SSH access for accounts in the administrators group, not specifically the built-in `admin` account, so I changed this to `ssh <your-admin-user>@<synology-ip>`.
- The UI method mounted `/data` from a named Docker volume in the Synology wizard, and the SSL section copied certificate files directly into the running container before recreating it. That certificate flow would not survive container recreation and did not match Portainer's documented SSL setup. I changed the guide to use persistent host storage for `/data` in the UI method and mounted host certificate files read-only into `/certs` for custom TLS.
- The prerequisites claimed specific RAM and disk minimums that were not supported by the official Portainer or Synology materials I reviewed. I replaced them with a validated requirement for persistent storage.
- The introduction used the term "environment templates", but Portainer's documentation refers to "app templates". I corrected the feature name.
- The conclusion said multi-container applications would be difficult or impossible through Container Manager alone. Synology documents Compose-based multi-container projects in Container Manager, so I changed that claim to a narrower and accurate comparison.

## Review Notes
- Portainer's current documentation recommends release-stream tags such as `:lts` or `:sts` rather than `:latest`. This review selected `:lts` because Portainer recommends LTS for production workloads.
- Portainer also documents port `8000` for Edge Agent tunneling, but that port is optional and not required for the local Synology/NAS use case described in the post.
- No additional technical issues remained after the corrections above.
