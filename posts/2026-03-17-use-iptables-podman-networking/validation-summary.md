# Validation Summary: How to Use iptables with Podman Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Netavark networking
- Linux bridge networking
- iptables
- systemd journalctl

## Sources Consulted
- Podman network documentation: https://docs.podman.io/en/stable/markdown/podman-network.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- iptables manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- iptables-extensions manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- journalctl manual page: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The post implied the iptables examples apply broadly to Podman networking. Updated the wording to scope the examples to rootful managed bridge networks where Podman uses iptables firewall rules, because current Podman defaults include Netavark and rootless pasta/slirp4netns behavior that does not map cleanly to the shown iptables `FORWARD` examples.
- The access restriction example used `iptables -I` twice without rule numbers. Since `-I` inserts at the top by default, the drop rule would be placed before the allow rule and block the permitted source IP. Updated the commands to insert the allow rule at position 1 and the drop rule at position 2.
- The rate limiting example said it limited connections per source IP but used `-m limit`, which is a global token bucket match. Replaced it with `-m hashlimit --hashlimit-mode srcip` and inserted the matching drop rule immediately after the allow rule.

## Review Notes
The commands are Linux-specific and assume a rootful Podman container attached to the default or another managed bridge network using an iptables-compatible firewall backend. Hosts using nftables/firewalld directly, rootless pasta/slirp4netns networking, macvlan, ipvlan, unmanaged bridges, or custom subnets may need different commands or adjusted CIDR values.
