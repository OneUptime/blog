# Validation Summary: How to Install Portainer on Unraid via Community Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Unraid
- Portainer Community Edition
- Docker
- Docker Compose
- Community Applications

## Sources Consulted
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Docker standalone update docs: https://docs.portainer.io/start/upgrade/docker
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose `up` reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose file reference for the obsolete top-level `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Unraid Community Applications docs: https://docs.unraid.net/unraid-os/using-unraid-to/run-docker-containers/community-applications/
- Unraid Docker overview: https://docs.unraid.net/unraid-os/using-unraid-to/run-docker-containers/overview/
- Unraid 6.10.0 release notes (Docker labels / GUI access for Compose-managed containers): https://docs.unraid.net/unraid-os/release-notes/6.10.0/
- Community Applications plugin source / release notes: https://raw.githubusercontent.com/Squidly271/community.applications/master/plugins/community.applications.plg

## Issues Found
- The post treated `http://<unraid-ip>:9000` as the primary access URL. I changed the primary access guidance to `https://<unraid-ip>:9443` and marked port `9000` as optional legacy HTTP because current Portainer docs use `9443` by default and only describe `9000` as a legacy option.
- The post used floating `portainer/portainer-ce:latest` tags throughout. I changed these to `portainer/portainer-ce:lts` so the article points readers to a supported Portainer release stream instead of an unpinned floating tag.
- The Compose example used deprecated/outdated Compose conventions: `docker-compose` and a top-level `version` field. I updated the example to use `docker compose` and removed the obsolete `version` key per current Docker documentation.
- The Compose file was written to `/tmp`, which is not an appropriate persistent location for a reproducible Unraid setup. I changed it to a persistent path under `/mnt/user/appdata/portainer/`.
- The article said Unraid would not be aware of stack-managed containers in the Docker tab. I replaced that absolute claim with a more accurate statement: Unraid does not natively manage Docker Compose deployments, so ongoing management is typically done through Portainer or the Docker CLI.
- The Community Applications update instructions referenced `Apps > My Apps`, which does not match current Unraid documentation. I updated this to the current `Apps` tab `Action Center` flow.
- The prerequisites listed Unraid `6.11 or later`. I updated this to `6.12 or later` based on the current Community Applications plugin requirement.

## Review Notes
- The post remains technically relevant and useful after the fixes.
- Portainer currently offers both STS and LTS streams; this review standardized the commands on `lts` because it is the safer long-term recommendation for self-hosted users following a guide.
- Unraid still does not natively support Docker Compose according to current docs, so the Compose section should be treated as an advanced, outside-the-native-UI workflow.
