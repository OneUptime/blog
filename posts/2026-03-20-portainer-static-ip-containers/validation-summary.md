# Validation Summary: How to Configure Static IP Addresses for Containers in Portainer - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker bridge networking
- Docker Compose
- Container IPAM and static IPv4 assignment

## Sources Consulted
- Docker `docker run` / container networking reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `docker network inspect` reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker `docker container rm` reference: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element (obsolete): https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`ipv4_address`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference (`ipam` / `ip_range`): https://docs.docker.com/reference/compose-file/networks/
- Docker bridge network driver docs: https://docs.docker.com/engine/network/drivers/bridge/
- Portainer add network docs: https://docs.portainer.io/user/docker/networks/add
- Portainer add container docs: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer advanced container settings docs: https://docs.portainer.io/user/docker/containers/advanced

## Issues Found
- The `docker network create` and `docker run` snippets used inline comments after line-continuation backslashes. In POSIX shells this breaks the command, so the inline comments were removed.
- The verification command required `jq` even though it was not listed as a prerequisite. It was replaced with Docker's built-in `--format` output for `docker network inspect`.
- The Portainer network creation steps omitted the required network name, and the container creation steps omitted the required container name and the documented Advanced container settings path to the Network section. Those UI steps were corrected to match Portainer documentation.
- The Compose example used the top-level `version: "3.8"` key, which current Docker Compose documentation marks as obsolete. The obsolete key was removed.
- The Step 5 explanation referred to DHCP/static conflicts, but Docker uses its own IPAM allocation rather than DHCP in this context. The wording was corrected to dynamic/static allocation conflicts.
- The Step 5 `--ip-range 172.25.0.50/27` example was not a valid CIDR-aligned pool for the stated layout. It was replaced with a CIDR-aligned range (`172.25.0.64/26`) and the subnet layout was updated accordingly.
- The Step 6 text incorrectly implied that recreation only loses the address when using a new container name. The explanation was corrected to state that removal and recreation loses the static assignment unless `--ip` is provided again.
- The Step 6 command used `docker rm dns-server` immediately after restarting a running container. Docker requires `-f` to remove a running container, so the command was corrected to `docker rm -f dns-server`.
- The prerequisites implied that a custom network already existed even though Step 1 creates it. The prerequisite was corrected to permission to create a custom network.

## Review Notes
- The post is technically sound after the fixes. For most modern Docker workloads, Docker recommends user-defined networks and container/service names for discovery, so static IPs remain a niche compatibility tool rather than the default design choice.
