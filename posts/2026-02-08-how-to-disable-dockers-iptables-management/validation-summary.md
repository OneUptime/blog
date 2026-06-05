# Validation Summary: How to Disable Docker's iptables Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Linux bridge networking
- iptables and Netfilter NAT/filter tables
- UFW
- firewalld
- Linux sysctl IP forwarding

## Sources Consulted
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Ubuntu manpage: ufw - https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu manpage: ufw-framework - https://manpages.ubuntu.com/manpages/jammy/man8/ufw-framework.8.html
- firewalld manpage: firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd
- iptables-extensions manpage: TRACE target - https://man.archlinux.org/man/iptables-extensions.8.en

## Issues Found
- The `daemon.json` examples contained JavaScript-style comments inside `json` code blocks. JSON configuration files do not allow comments, so the snippets were changed to valid JSON.
- The verification section implied Docker would create no iptables rules and suggested checking `docker info` for iptables state. Docker documents that `iptables=false` prevents most, not all, firewall rules. The verification text was changed to validate the daemon config and check for Docker's usual host-level bridge chains.
- The failure description overstated the effect of disabling iptables. Docker documents that containers lose masqueraded internet access, while unpublished container ports may become reachable from hosts that can route to the bridge network. The affected-features list was corrected.
- The manual chain setup used older isolation chain names and omitted the NAT-table `DOCKER` chain required by later DNAT commands. The example now creates the current `DOCKER-FORWARD` chain and the `nat` table `DOCKER` chain.
- The port publishing example appended a DNAT rule to a NAT chain that had not been created and omitted the `OUTPUT` jump needed for host-originated traffic to host addresses. The missing NAT chain and NAT jumps were added.
- The port publishing test used `localhost`, but the shown iptables DNAT path targets non-loopback host addresses. The test was changed to use the host's non-loopback address.
- The automation script flushed Docker chains but did not ensure the chains and NAT jumps existed. It now creates the chains if missing and adds the required PREROUTING and OUTPUT jumps idempotently.
- The UFW example opened host port 8080 but did not forward traffic to the container. It was changed to use `ufw route allow` for routed container traffic.
- The firewalld example opened host port 8080 but did not create a forwarding rule to the container. It was changed to use `--add-forward-port` with the container IP and port.
- The re-enable cleanup referenced the older `DOCKER-ISOLATION-STAGE-*` chains. It was updated to match the corrected `DOCKER-FORWARD` example.

## Review Notes
The article is now technically valid as a manual iptables/firewall guide, but Docker's own documentation warns that recreating Docker's firewall behavior after disabling `iptables` is extremely involved. The examples remain intentionally minimal and are best treated as a starting point for controlled environments, not a complete replacement for Docker's full bridge-network firewall implementation.
