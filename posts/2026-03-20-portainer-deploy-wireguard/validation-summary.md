# Validation Summary: How to Deploy WireGuard VPN via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- LinuxServer.io WireGuard container
- WireGuard
- Linux networking

## Sources Consulted
- LinuxServer.io WireGuard image documentation: https://docs.linuxserver.io/images/docker-wireguard/
- WireGuard installation guide: https://www.wireguard.com/install/
- WireGuard quick start: https://www.wireguard.com/quickstart/
- `wg(8)` official man page from `wireguard-tools`: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- Docker Compose reference for the obsolete top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack editing documentation: https://docs.portainer.io/sts/user/docker/stacks/edit

## Issues Found
- The Compose example used the top-level `version: "3.8"` field, which Docker now marks as obsolete. I removed it to match the current Compose specification.
- The post used `peer_1` and `peer_*/` paths for numbered peers, but the linuxserver image stores numbered peers under `/config/peer1`, `/config/peer2`, and so on. I corrected the paths accordingly.
- The `docker exec wireguard ls /config/peer_*/` example relied on wildcard expansion that would not occur as written. I changed it to `docker exec wireguard sh -c 'ls -d /config/peer*'`.
- The QR-code example attempted to `cat` a PNG file, which is not a valid way to view it in a terminal. I replaced that with a directory listing for the generated files and the documented `docker exec -it wireguard /app/show-peer 1` command.
- The desktop client copy command referenced the wrong numbered peer path. I updated it to `/config/peer1/peer1.conf`.
- The post described `0.0.0.0/0` as routing "all traffic", which is only true for IPv4. I clarified that it is an IPv4 full tunnel and noted that `::/0` must be added for a dual-stack full tunnel.
- The split-tunnel example omitted the WireGuard server IP that LinuxServer.io documents as part of the reachable tunnel destinations. I updated the example to include `10.13.13.1/32`.
- The prerequisite wording implied Linux 5.6+ was strictly required. I corrected it to require WireGuard kernel support, while noting that Linux 5.6+ includes WireGuard in-kernel.

## Review Notes
- LinuxServer.io still documents a Portainer-specific caveat: some Portainer versions may not apply `cap_add` or `sysctl` correctly for this image. The post is still technically relevant, but readers should be aware of that compatibility note if deployment fails in Portainer.
- Docker is not installed in this review workspace, so validation was performed against official documentation and man pages rather than by running the container locally.
