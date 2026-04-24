# Validation Summary: How to Install Portainer on ASUSTOR NAS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASUSTOR ADM
- ASUSTOR Docker Engine
- Portainer Community Edition
- Docker Engine
- Docker Compose
- SSH

## Sources Consulted
- ASUSTOR App Central: Docker Engine https://www.asustor.com/en/app_central/app_detail?id=1738
- ASUSTOR App Central: Docker Engine (ADM 4.0 models) https://www.asustor.com/en/app_central/app_detail?id=1676&type=
- ASUSTOR Online Help: Terminal https://www.asustor.com/online/online_help?id=24&lan=en
- ASUSTOR Online Help: ADM Defender https://www.asustor.com/en/online/online_help?id=9
- Portainer Docs: Install Portainer CE with Docker on Linux https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docs: Updating on Docker Standalone https://docs.portainer.io/start/upgrade/docker
- Portainer Docs: Requirements and prerequisites https://docs.portainer.io/start/requirements-and-prerequisites
- Docker Docs: docker compose up https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: Version and name top-level elements https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Bind mounts https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Start containers automatically https://docs.docker.com/engine/containers/start-containers-automatically/

## Issues Found
- The post referred to ASUSTOR's current Docker app as `Docker`, but the official App Central package is `Docker Engine`. I updated the introduction, prerequisites, and setup steps to use the current product name.
- The prerequisite `ADM 4.2 or later` was too specific and not accurate across current ASUSTOR models, because official Docker Engine packages differ by model and ADM generation. I replaced it with a compatibility-based prerequisite tied to Docker Engine availability in App Central.
- The `At least 2GB RAM` prerequisite was not supported by Portainer's current official requirements. I removed it rather than keep an unverified minimum.
- The CLI install used `portainer/portainer-ce:latest` and opened `9000` as if it were the primary UI port. Current Portainer docs use HTTPS on `9443` by default and describe `9000` as legacy HTTP. I changed the install and update commands to use `portainer/portainer-ce:lts`, expose `9443`, and note `9000` as optional legacy access only.
- The CLI install used a custom Docker local volume with bind options. While workable, the post did not need that indirection and the Docker docs directly document bind mounts. I simplified the example to bind `/volume1/Docker/portainer` directly to `/data`.
- The Compose example used `docker-compose up -d`, which is legacy Compose v1 syntax. ASUSTOR's Docker Engine package ships Compose v2, and Docker's current CLI is `docker compose`. I updated the deploy command accordingly.
- The Compose file included the top-level `version` field, which Docker now documents as obsolete. I removed it.
- The Compose example also used `portainer/portainer-ce:latest` and exposed `9000` as a standard UI port. I updated it to `portainer/portainer-ce:lts` and `9443`.
- The firewall navigation path was too specific and did not match ASUSTOR's current official documentation, which documents firewall management under `ADM Defender`. I updated that step.
- The access URL used `http://<asustor-ip>:9000`. Current Portainer docs direct users to `https://<host>:9443` by default. I corrected the access step and noted the expected self-signed certificate warning.
- The troubleshooting advice to run `sudo usermod -aG docker admin` was not supported by ASUSTOR's official SSH guidance and is not a reliable current instruction for ADM. I removed it and replaced it with supported guidance to use an administrator-group account or `root`.
- The custom `/usr/local/etc/rc.d/portainer-start.sh` startup script was not backed by the ASUSTOR documentation I reviewed, and current Docker Engine release notes state that manually deployed containers can restart properly after reboot. I replaced that section with safer, documented guidance.

## Review Notes
- Portainer's current documentation distinguishes between `LTS` and `STS` image tags. I used `:lts` in the corrected examples because this post is written as a general-purpose installation guide rather than a feature-preview guide.
- Portainer CE is also available in ASUSTOR App Central on some model and ADM combinations, but the post's manual Docker-based installation approach remains technically valid after the fixes above.
