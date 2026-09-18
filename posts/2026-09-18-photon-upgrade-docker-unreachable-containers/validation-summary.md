# Validation Summary: Troubleshoot Unreachable Docker Containers After a Photon OS Upgrade

## Status
validated

## Post Type
Technical troubleshooting guide with Linux and Docker diagnostic commands.

## Technologies Covered
- Photon OS and Linux host networking
- Docker Engine, bridge networks, published ports, and container DNS
- systemd-networkd, networkctl, journalctl, and network configuration ownership
- iproute2, sysctl, iptables, NAT, and IP forwarding
- cloud-init and Photon Network Configuration Manager
- VMware vSphere, port groups, VLANs, routing, and MTU

## Sources Consulted
- Docker CLI references: [version](https://docs.docker.com/reference/cli/docker/version/), [container ls and docker ps](https://docs.docker.com/reference/cli/docker/container/ls/), [container logs](https://docs.docker.com/reference/cli/docker/container/logs/), [inspect](https://docs.docker.com/reference/cli/docker/inspect/), [container port](https://docs.docker.com/reference/cli/docker/container/port/), [network ls](https://docs.docker.com/reference/cli/docker/network/ls/), and [network inspect](https://docs.docker.com/reference/cli/docker/network/inspect/).
- Docker [port publishing and mapping](https://docs.docker.com/engine/network/port-publishing/) — bind addresses and the localhost exposure exception before Engine 28.0.0.
- Docker [packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) and [Docker with iptables](https://docs.docker.com/engine/network/firewall-iptables/) — bridge firewall ownership, forwarding, masquerading, and DOCKER-USER.
- Docker [bridge network driver](https://docs.docker.com/engine/network/drivers/bridge/) and [networking overview](https://docs.docker.com/engine/network/) — bridge behavior, MTU, and DNS.
- Photon OS [network configuration troubleshooting](https://vmware.github.io/photon/docs-v3/troubleshooting-guide/photon-os-general-troubleshooting/network-configuration/) and [Using the Network Configuration Manager](https://vmware.github.io/photon/docs-v4/administration-guide/managing-network-configuration/using-the-network-configuration-manager/).
- Upstream systemd manuals reproduced on man7.org: [systemd.network](https://man7.org/linux/man-pages/man5/systemd.network.5.html), [networkctl](https://man7.org/linux/man-pages/man1/networkctl.1.html), [journalctl](https://man7.org/linux/man-pages/man1/journalctl.1.html), and [os-release](https://man7.org/linux/man-pages/man5/os-release.5.html).
- Upstream utility manuals reproduced on man7.org: [cat](https://man7.org/linux/man-pages/man1/cat.1.html), [uname](https://man7.org/linux/man-pages/man1/uname.1.html), [ip](https://man7.org/linux/man-pages/man8/ip.8.html), [ip-route](https://man7.org/linux/man-pages/man8/ip-route.8.html), and [sysctl](https://man7.org/linux/man-pages/man8/sysctl.8.html).
- Upstream Netfilter manuals reproduced on man7.org: [iptables](https://man7.org/linux/man-pages/man8/iptables.8.html) and [iptables-restore](https://man7.org/linux/man-pages/man8/iptables-restore.8.html).
- Linux kernel [IP sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html).
- cloud-init [network configuration reference](https://docs.cloud-init.io/en/23.2.2/reference/network-config.html) — indexed documentation on network rendering and Photon fallback behavior; direct page retrieval was unavailable.
- Broadcom [virtual machine network troubleshooting](https://knowledge.broadcom.com/external/article/324542/) — NIC connectivity, port groups, VLANs, and MTU checks.
- [Network Configuration Manager upstream repository](https://github.com/vmware-archive/network-config-manager).

## Issues Found
No technical issues found.

## Review Notes
- Verified the diagnostic commands and flags, including docker ps -a, docker logs --tail=100, docker inspect, docker port, Docker network inspection, ip -br address, ip route, networkctl list/status, journalctl -b -u systemd-networkd --no-pager, sysctl net.ipv4.ip_forward, and the iptables -S variants. No deprecated syntax was identified.
- The distinction between a running container and a reachable application is correct. Published-port inspection and separate host, external-client, and container tests are appropriate ways to narrow the fault domain. The observation table presents investigation areas rather than definitive diagnoses.
- Confirmed systemd's first matching .network file behavior and the risk of broad [Match] settings applying to Docker links. Configuration can also originate in runtime and vendor directories, so the advice to inspect active and generated configuration is appropriate.
- Confirmed Docker's documented pre-28.0.0 same-layer-2 localhost exposure caveat. Checking the installed Engine version and vendor fixes is appropriate; the article does not assume a particular Photon/Docker package combination.
- Firewall inspection is correctly qualified for Docker's iptables backend. A restore operation can flush existing rules, and disabling Docker's firewall management can break bridge connectivity. DOCKER-USER is the documented location for additional forwarded-traffic filtering with that backend.
- Commands assume adequate administrative access to Docker, firewall rules, and system journals. The examples primarily inspect IPv4; IPv6 deployments also require corresponding IPv6 routing, forwarding, and firewall checks. These are deployment caveats, not errors in the commands shown.
- The Docker documentation links and author profile resolved to the intended resources. The freedesktop.org systemd reference could not be retrieved by the browsing tool; its content was checked through the upstream manual reproduced on man7.org. This retrieval limitation does not establish that the article's URL is broken.
- Validation was based on documentation and command review. No live Photon upgrade, container connectivity test, or vSphere repair was performed. The post describes plausible causes to investigate, not a verified universal upgrade regression.
- README.md required no changes.
