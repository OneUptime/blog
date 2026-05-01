# Validation Summary: How to Deploy WireGuard VPN via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- WireGuard
- LinuxServer WireGuard Docker image
- Docker Compose / Portainer Stacks
- Portainer
- OneUptime port monitoring and custom probes

## Sources Consulted
- LinuxServer WireGuard image documentation: https://docs.linuxserver.io/images/docker-wireguard/
- WireGuard official site: https://www.wireguard.com/
- Portainer "Add a new stack" documentation: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- OneUptime Port Monitor documentation: https://oneuptime.com/docs/monitor/port-monitor
- OneUptime Custom Probes documentation: https://oneuptime.com/docs/probe/custom-probe

## Issues Found
1. **Outdated image reference and obsolete Compose top-level version field.** The post used `linuxserver/wireguard:latest` and `version: "3.8"`. LinuxServer's current docs use `lscr.io/linuxserver/wireguard:latest`, and Docker's Compose docs mark the top-level `version` field as obsolete. Updated the image reference and removed the `version` line.
2. **QR-code log retrieval would not work as written.** The post told readers to view generated peer QR codes in container logs, but LinuxServer only writes those QR codes to logs when `LOG_CONFS=true` is set. Added `LOG_CONFS: "true"` to the environment block.
3. **`docker exec` example assumed a container name the stack did not define.** The command `docker exec -it wireguard /app/show-peer 1` requires a container actually named `wireguard`. Added `container_name: wireguard` so the command matches the stack example.
4. **Monitoring guidance used the wrong protocol.** WireGuard listens on UDP 51820, but the post recommended a TCP port monitor. Changed this to a generic port monitor on `<host>:51820/udp` and clarified that internal tunnel-path monitoring should use a OneUptime custom probe inside the VPN or private network.

## Review Notes
- The remaining WireGuard-specific settings in the stack example, including `NET_ADMIN`, `SYS_MODULE`, `net.ipv4.conf.all.src_valid_mark`, `PEERS`, `PEERDNS`, `INTERNAL_SUBNET`, and `/app/show-peer`, are consistent with the LinuxServer documentation.
- LinuxServer's docs include a Portainer-specific caveat: some Portainer versions do not implement `cap_add` or `sysctl` handling correctly for this image. The post is technically valid, but readers on affected Portainer versions may still need to deploy the same compose file with `docker compose` instead.
- Docker is not installed in this review workspace, so I could not run `docker compose config`; however, the YAML block was parsed successfully with a local YAML parser after the edits.
