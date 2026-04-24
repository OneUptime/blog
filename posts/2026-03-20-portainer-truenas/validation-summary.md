# Validation Summary: How to Install Portainer on TrueNAS

## Status
validated

## Post Type
Guide

## Technologies Covered
- TrueNAS SCALE
- TrueNAS CORE
- Portainer Community Edition
- Docker Engine
- Docker Compose
- Linux virtual machines
- ZFS snapshots

## Sources Consulted
- TrueNAS SCALE Apps UI reference: https://www.truenas.com/docs/scale/24.10/printview/scaleuireference/
- TrueNAS 24.10 upgrade notes: https://www.truenas.com/docs/scale/24.10/gettingstarted/printview/
- TrueNAS SCALE shell usage and support warning: https://www.truenas.com/docs/scale/24.10/scaletutorials/systemsettings/usescaleshell/
- TrueNAS administrator login behavior in 24.10: https://www.truenas.com/docs/scale/24.10/scaletutorials/credentials/adminroles/
- TrueNAS Apps Market Portainer app page: https://apps.truenas.com/catalog/portainer/
- TrueNAS custom app installation via Docker Compose YAML: https://apps.truenas.com/managing-apps/installing-custom-apps/
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Engine installation on Ubuntu, including the convenience script notes: https://docs.docker.com/installation/ubuntulinux/
- TrueNAS CORE virtual machines documentation: https://www.truenas.com/docs/core/13.0/uireference/jailspluginsvms/virtualmachines/

## Issues Found
- The introduction and prerequisites were outdated. The post said SCALE Apps were Kubernetes-based and claimed Docker support from 22.12 onward, but current TrueNAS Docker-based Apps begin with 24.10. I updated the version guidance and SCALE explanation.
- The SCALE host-shell deployment path was unsupported. The post instructed readers to SSH into the TrueNAS host and run `docker` directly, but TrueNAS documents Web UI and API as the supported configuration paths. I replaced that with the supported custom app workflow using **Install via YAML**.
- The SCALE setup instructions referenced a non-current UI flow. The post told readers to set a container runtime to Docker, but 24.10 already uses Docker for Apps and the documented setup flow is choosing an Apps pool and using Discover Apps. I corrected those steps.
- The Portainer deployment examples used outdated defaults. The post used `portainer/portainer-ce:latest`, `docker-compose`, and HTTP port `9000` as the main access path. I updated the examples to the current Portainer CE Docker guidance: `portainer/portainer-ce:sts`, `docker compose`-style YAML, and HTTPS on `9443`, with `9000` called out as legacy-only.
- The App Catalog section was inaccurate. It described the catalog path as Kubernetes-based and implied Portainer might or might not be present. The current TrueNAS catalog provides Portainer in the Community train and the app page lists a minimum TrueNAS version of 24.10.2.2. I updated the instructions accordingly.
- The CORE section heading and commands needed correction. The section was titled as a jail-based approach even though the content used a Linux VM. I renamed it to a Linux VM method, corrected the UI navigation, fixed Docker installation privileges, and updated the Portainer image/tag and access port guidance.
- The firewall section referenced a nonexistent TrueNAS firewall UI path. I replaced it with accurate guidance to allow the required ports on any external firewall, router ACL, or VLAN policy.

## Review Notes
- TrueNAS CORE virtualization is documented as obsolete, so the CORE path should be treated as a legacy workaround rather than the preferred installation target.
- The Portainer catalog app is in the Community train, so availability and app version can change independently of the base TrueNAS release.
- If readers use legacy HTTP access on port `9000`, it should be an explicit compatibility choice rather than the default recommendation.
