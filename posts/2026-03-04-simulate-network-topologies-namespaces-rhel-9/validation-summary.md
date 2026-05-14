# Validation Summary: How to Simulate Complex Network Topologies with Namespaces on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux network namespaces
- iproute2 `ip netns`, `ip link`, and `ip route`
- Virtual Ethernet (`veth`) interfaces
- IPv4 forwarding and routing
- nftables packet filtering
- `tc netem` network emulation
- `ping`, `tracepath`, `curl`, `tcpdump`, and Python `http.server`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters, nftables: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters
- Red Hat Enterprise Linux 9.0 release notes, deprecated networking functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/deprecated_functionality
- Linux `network_namespaces(7)` manual page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux `ip-netns(8)` manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `veth(4)` manual page: https://man7.org/linux/man-pages/man4/veth.4.html
- Linux `tc-netem(8)` manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Local command help output for `ip netns`, `ip link`, `tc qdisc`, `ping`, `tracepath`, `sysctl`, `nft`, and `python3 -m http.server`.

## Issues Found
- The firewall example used `iptables` commands. In RHEL 9, Red Hat deprecates the `iptables-nft` utilities for new deployments and recommends using the `nft` command from nftables instead. I replaced the `iptables -A FORWARD` and `iptables -D FORWARD` examples with `nft` commands that create a dedicated IPv4 filter table, create a forward hook chain, add the equivalent source/destination drop rule, and remove the test table afterward.

## Review Notes
- The namespace, veth, address assignment, route, forwarding, ping, tracepath, service, tcpdump, and cleanup commands are consistent with current Linux/iproute2 behavior.
- The `tc netem` examples are technically valid for adding delay and packet loss on the outbound side of `router1`'s inter-router interface.
- The automation script assumes it is run with sufficient privileges, such as root or via `sudo`, which is appropriate for namespace and link management commands.
