# Validation Summary: How to Set Up Docker on an Oracle Cloud Free Tier Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Oracle Cloud Infrastructure Compute and Always Free resources
- Oracle Linux 8/9
- Ubuntu 22.04
- Docker Engine
- Docker Compose
- OCI security lists and host firewalls
- Docker daemon configuration
- cAdvisor monitoring

## Sources Consulted
- Docker Engine installation overview: https://docs.docker.com/engine/install/
- Docker Engine on RHEL: https://docs.docker.com/engine/install/rhel/
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker json-file logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker live restore: https://docs.docker.com/engine/daemon/live-restore/
- Docker Compose file reference for the top-level version field: https://docs.docker.com/reference/compose-file/version-and-name/
- OCI Always Free resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- OCI platform images and firewall rules: https://docs.oracle.com/en-us/iaas/Content/Compute/References/images.htm
- OCI security lists: https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm
- Oracle Linux packet-filtering firewall documentation: https://docs.oracle.com/en-us/iaas/oracle-linux/firewall/ol-firewall-about-packet-filtering-firewalls.htm
- cAdvisor upstream README: https://github.com/google/cadvisor

## Issues Found
- The AMD `VM.Standard.E2.1.Micro` shape was described as having 1 OCPU. Oracle's Always Free documentation describes it as 1/8 OCPU with burst capability and 1 GB RAM, so the shape description was corrected.
- The Oracle Linux Docker install snippet used older package/repository names and omitted the current `docker-buildx-plugin` package from Docker's RHEL install instructions. The commands now use `dnf-plugins-core`, Docker's RHEL repository, and the current package set.
- The Ubuntu Docker install snippet used an older repository setup style and omitted `docker-buildx-plugin`. It was updated to Docker's current `docker.sources`/`docker.asc` pattern and current package set.
- The Ubuntu firewall persistence command used `netfilter-persistent save` without installing the package that provides it. The snippet now installs `iptables-persistent` before saving.
- The example `daemon.json` code block included a `//` comment, which is invalid JSON. The comment was removed while keeping the valid Docker daemon configuration.
- The Compose sample included `version: "3.8"`, which Docker now marks as an obsolete top-level field. The field was removed.
- The cAdvisor command used the older `gcr.io/cadvisor/cadvisor:latest` image and omitted upstream recommended mounts/options. It now uses the current `ghcr.io/google/cadvisor:0.57.0` image with the additional `/dev/disk` mount, privileged mode, and `/dev/kmsg` device.

## Review Notes
- Docker documents that installation on distribution derivatives is not tested or verified in all cases. Oracle Linux is RHEL-compatible, so the RHEL repository instructions are the closest current Docker-maintained path, but future Oracle Linux package compatibility should be rechecked if Docker changes repository support.
- Adding a user to the `docker` group is technically correct for running Docker without `sudo`, but Docker documents that this group grants root-level privileges.
