# Validation Summary: How to Understand Container Networking Through Network Namespaces on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- Linux network namespaces
- veth pairs and Linux bridges
- iproute2 `ip`, `bridge`, and `nsenter` commands
- iptables NAT and forwarding rules
- Podman container networking
- Docker-style bridge networking concepts

## Sources Consulted
- Red Hat Enterprise Linux 9: Building, running, and managing containers, especially Podman Netavark/CNI networking guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/managing-container-images-by-using-the-rhel-web-console_building-running-and-managing-containers
- Podman network manual, default Netavark backend and default `podman` bridge subnet: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman network create manual, bridge mode NAT and DNAT behavior: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- iproute2 `ip-link(8)` manual for link, veth, bridge, and netns syntax: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iproute2 `ip-route(8)` manual for route syntax: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- Local command help for `ip netns`, `ip link`, `iptables`, `nsenter`, and `bridge`.

## Issues Found
- The post used `cni-podman0` as the RHEL/Podman bridge example. RHEL 9 Podman defaults to Netavark, whose default network is `podman` and commonly uses `podman0`; CNI is deprecated. Updated the diagram, bridge example, and troubleshooting command to use `podman0` while leaving CNI only as a possible rule-name match.
- The veth examples created a peer named `eth0` in the host namespace before moving it into the network namespace. That can fail on systems that already have a host `eth0`. Changed the examples to create uniquely named peers, move them into the namespace, and rename them to `eth0` inside the namespace.
- The port-forwarding example added only a `PREROUTING` DNAT rule but tested with `curl http://localhost:8080`, which is locally generated traffic and does not traverse `PREROUTING`. Changed the test to use the host IP from another machine.
- The text said the manual iptables example is "exactly" what `podman run -p` does. Podman uses Netavark on RHEL 9 and the exact firewall backend/rule names vary. Reworded this as the same basic NAT and forwarding behavior.
- The forwarding rule used the older iptables `state` match. Updated it to the current `conntrack` match while preserving the same `RELATED,ESTABLISHED` behavior.
- The cleanup commands flushed whole iptables chains, which can remove unrelated host firewall rules. Replaced them with `iptables -D` commands matching the rules added by the tutorial.
- The wrap-up described RHEL container networking as `iptables NAT`. Updated it to the more accurate `firewall NAT`, because RHEL 9 and Podman may use nftables/Netavark-backed firewall rules rather than literal iptables chains.

## Review Notes
The hand-built namespace lab remains a simplified rootful bridge-networking model. Rootless Podman networking and firewalld policy interactions can differ, but the corrected post is technically accurate for the tutorial scope.
