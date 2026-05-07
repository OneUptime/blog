# Validation Summary: How to Install Rancher on a Single Node with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Docker Engine and Docker CLI
- Linux server administration
- Kubernetes management with Rancher
- TLS/bootstrap password setup for Rancher

## Sources Consulted
- Rancher Docs: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher Docs: Advanced Options for Docker Installs - https://ranchermanager.docs.rancher.com/v2.14/reference-guides/single-node-rancher-in-docker/advanced-options
- Rancher Docs: Upgrading Rancher Installed with Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker/upgrade-docker-installed-rancher
- Rancher Docs: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher Docs: Installing Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/install-docker
- Rancher Docs: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher Docs: Choosing a Rancher Version - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Rancher Docs: Port Requirements - https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Docker Docs: Ubuntu installation and convenience script guidance - https://docs.docker.com/installation/ubuntulinux/
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: `docker container logs` reference - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/

## Issues Found
- The introduction described single-node Rancher with Docker as suitable for small-scale production. Rancher explicitly documents Docker installs as unsupported for production, so the wording was corrected to development and testing only.
- The prerequisites hard-coded resource and Docker-version guidance that no longer matches Rancher's current documentation. These were changed to point readers to Rancher's current installation requirements and support-matrix-validated Docker versions instead of an outdated generic minimum.
- The post omitted Rancher's documented requirement for the `net.bridge.bridge-nf-call-iptables=1` host sysctl. This requirement was added to the prerequisites and troubleshooting guidance.
- Step 2 referred to a "persistent volume," but the example uses a host-path bind mount (`/opt/rancher:/var/lib/rancher`), not a Docker-managed volume. The terminology was corrected to "persistent storage."
- The installation verification step relied on grepping for a `ready` log line, which is not documented as a stable Rancher readiness signal. It was changed to checking that the container is running and reviewing recent logs.
- The backup example used `tar` without `sudo` even though the bind-mounted Rancher data under `/opt/rancher` is typically root-owned. The command was corrected to `sudo tar`.
- The upgrade section pulled `rancher/rancher:latest` generically. Rancher documents using explicit image tags for Docker upgrades, so the commands were updated to use `<rancher-version-tag>` and to preserve the original container options.

## Review Notes
- The post still uses `rancher/rancher:latest` for the initial install because Rancher's official single-node Docker install example does the same for development and testing. Rancher also documents that `latest` is its latest development release, so explicit version tags are preferable when you need deterministic behavior.
- Docker's `get.docker.com` convenience script is official and valid for quick setup, but Docker documents it as a convenience path rather than the recommended production installation method.
