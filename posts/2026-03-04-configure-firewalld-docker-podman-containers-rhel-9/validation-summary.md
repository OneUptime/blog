# Validation Summary: How to Configure Firewalld for Docker and Podman Containers on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld and firewall-cmd
- Docker Engine networking, bridge networks, port publishing, and iptables/nftables integration
- Podman rootless and rootful networking
- Netavark, CNI, slirp4netns, and pasta
- Linux NAT, masquerading, and IP forwarding

## Sources Consulted
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- firewalld manual: firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld zone options - https://firewalld.org/documentation/zone/options.html
- Podman Docs: podman-network - https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman Docs: podman-network-create - https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman Docs: podman-network-inspect - https://docs.podman.io/en/latest/markdown/podman-network-inspect.1.html
- Podman Docs: podman-pod-create - https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Red Hat Documentation: RHEL 9 Building, running, and managing containers, container networking chapters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/
- Red Hat Documentation: RHEL 9 Considerations in adopting RHEL 9, default container network stacks - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/
- Local Docker CLI help: `docker run --help`

## Issues Found
- The introduction said Docker and Podman both manipulate networking rules to expose ports. This was too broad for rootless Podman, so it now specifies Docker and rootful Podman.
- The general port-publishing explanation implied all container publishing uses NAT rules. This was narrowed to bridge-network publishing because rootless Podman with pasta or slirp4netns behaves differently.
- The Docker `iptables: false` explanation said published ports simply will not work. Docker documentation is more nuanced: disabling firewall management prevents Docker from creating most of its normal bridge, masquerade, and port-publishing rules, requiring replacement rules. The post now reflects that.
- The Docker firewalld zone recipe incorrectly told readers to create a `docker` firewalld zone manually. Current Docker creates the `docker` zone and assigns bridge interfaces when firewalld is enabled, so the section now tells readers to verify Docker's zone instead.
- The same Docker section incorrectly implied that allowing or blocking a port in the `public` zone controls Docker-published ports. The post now says Docker's own forwarding rules control these ports and recommends binding to localhost or a specific host address for simple exposure control.
- The Podman rootless section did not mention the RHEL 9.5 default change from slirp4netns to pasta. The post now includes that version-specific caveat.
- The Podman backend check used `podman info | grep networkBackend`, which is less reliable than the documented Go template. It now uses `podman info --format '{{.Host.NetworkBackend}}'`.
- The rootful Podman bridge example assumed the bridge interface is always `podman0`. It now reads the bridge interface from `podman network inspect podman --format '{{.NetworkInterface}}'` before assigning it to a firewalld zone.
- The practical web app example published ports 80 and 443 with `podman run` without noting that rootless Podman cannot bind privileged ports by default. The command now uses `sudo podman` and states that it runs as root.
- The masquerading section implied users generally need to enable firewalld masquerading for container outbound internet access. Docker and Podman normally manage masquerading for their managed bridge networks, so the text now limits this advice to cases where the user is managing forwarding rules themselves.
- The troubleshooting note said Docker NAT rules are processed before firewalld filter rules. This was reworded to the more accurate claim that Docker creates its own forwarding and port-publishing rules, so ordinary host input rules may not restrict Docker-published ports; the post now points to localhost binding or the `DOCKER-USER` chain.

## Review Notes
The corrected post is technically sound as a general RHEL 9 guide, but Docker and Podman networking behavior still depends on runtime version, selected network backend, and whether the host uses nftables or iptables compatibility. Readers should test exposure from an external host, as the post already recommends.
