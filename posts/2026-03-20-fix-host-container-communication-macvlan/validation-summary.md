# Validation Summary: How to Fix Host-to-Container Communication Issues with Docker macvlan

## Status
validated

## Post Type
Guide / Troubleshooting

## Technologies Covered
- Docker
- Docker macvlan networking
- Linux networking
- `iproute2` (`ip link`, `ip addr`, `ip route`)
- Netplan
- systemd

## Sources Consulted
- Docker Docs, "Macvlan network driver": https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs, "Networking": https://docs.docker.com/network/
- Docker Docs, "`docker container run` reference": https://docs.docker.com/reference/cli/docker/container/run/
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-address(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The route examples used `192.168.1.220/27`, which is a host address with a `/27` prefix, not the canonical subnet route. I changed both route commands to `192.168.1.192/27`, which is the actual `/27` network containing `192.168.1.220`.
- The post described the shim IP as being on the "same LAN" and "different from Docker container range", but Docker's documented workaround is to assign the host macvlan interface an IP in the Docker macvlan subnet. I clarified the wording and comments so the example consistently uses an unused IP inside `192.168.1.192/27`.
- The Netplan YAML snippet defined a VLAN under `vlans:`, which does not create a macvlan interface and would not implement the workaround described in the post. I removed that incorrect snippet and kept the systemd service approach, which matches the post's own conclusion that Netplan does not directly support macvlan.
- I also adjusted the `ip link add` examples to the documented `ip link add link eth0 name macvlan-shim type macvlan mode bridge` form for clarity and consistency with `ip-link(8)`.

## Review Notes
- The post is technically correct in stating that containers on a Docker macvlan network cannot communicate directly with the host, and Docker's official documentation explicitly mentions creating a host-side macvlan interface as a workaround.
- If Docker is managing the entire macvlan subnet, the shim IP should be reserved from Docker IPAM when the network is created, for example with `--aux-address`, to avoid accidental address conflicts.
- Docker's macvlan driver is Linux-only, is not supported in rootless mode, and is not supported on Docker Desktop for Mac or Windows.
- Runtime execution was not possible in this environment because Docker is not installed, so the review was completed against official documentation rather than a live network test.
