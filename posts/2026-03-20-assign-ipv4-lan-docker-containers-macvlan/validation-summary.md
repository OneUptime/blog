# Validation Summary: How to Assign IPv4 Addresses from Your LAN to Docker Containers with macvlan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker macvlan networking
- Docker Compose
- IPv4 LAN addressing and DHCP planning
- Pi-hole container
- Home Assistant Container

## Sources Consulted
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Pi-hole Docker configuration - https://docs.pi-hole.net/docker/configuration/
- Pi-hole v5 to v6 upgrade notes - https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Home Assistant Container on Linux - https://www.home-assistant.io/installation/linux/
- RFC 6762: Multicast DNS - https://www.rfc-editor.org/rfc/rfc6762
- RFC 8375: Special-Use Domain `home.arpa.` - https://www.rfc-editor.org/rfc/rfc8375

## Issues Found
- The post used `--ip-range 192.168.1.220/27` and stated that it covered `.220-.251`. That CIDR is not a valid `/27` boundary for the intended range. I corrected the reserved LAN plan and changed the examples to use `192.168.1.224/27` for the auto-assigned pool while keeping fixed container IPs in `.220-.223`.
- The Pi-hole example used the legacy `WEBPASSWORD` environment variable. Current Pi-hole v6 container documentation uses `FTLCONF_webserver_api_password`, so I updated the command accordingly.
- The Compose example included the top-level `version: "3.8"` field. Current Compose documentation marks `version` as obsolete, so I removed it.
- The DNS examples used `.local`, which RFC 6762 reserves for Multicast DNS. I changed the example names to `home.arpa`, which RFC 8375 designates for home-network naming.
- The post did not mention that the macvlan driver is Linux-only. I added a brief platform caveat so the instructions do not mislead Docker Desktop users on macOS or Windows.

## Review Notes
- The examples assume a Linux Docker Engine host connected to a physical LAN. Docker documents that macvlan is also unsupported in rootless mode, and many cloud providers block it.
- The host-to-container isolation note is technically correct. Docker's official guidance also notes that a workaround is to add a separate bridge network or create a macvlan interface on the host.
