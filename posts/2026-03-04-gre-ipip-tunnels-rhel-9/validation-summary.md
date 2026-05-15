# Validation Summary: How to Set Up GRE and IPIP Tunnels on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux IP tunnels
- GRE
- IPIP
- iproute2 `ip tunnel`
- NetworkManager `nmcli`
- firewalld
- tcpdump

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring IP tunnels": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-ip-tunnels_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Linux `ip-tunnel(8)` manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- NetworkManager `ip-tunnel` settings reference: https://networkmanager.dev/docs/api/latest/settings-ip-tunnel.html
- Local CLI help output for `ip tunnel help`

## Issues Found
- The IPIP firewalld direct rules were added only to the runtime configuration, then the post immediately reloaded firewalld. That reload would remove runtime-only rules. I changed the IPIP direct-rule commands to include `--permanent` before `--direct`.
- The NetworkManager GRE persistence example created the tunnel and assigned the tunnel endpoint address, but did not persist the route for the remote private subnet shown earlier in the post. I added `ipv4.routes "192.168.2.0/24 10.20.20.2"` to the `nmcli connection add` command.
- The tutorial routes private subnets through the tunnel. For hosts acting as routers between those private networks, IPv4 forwarding must be enabled. I added this as a prerequisite so the routing examples are technically complete.

## Review Notes
- The `firewalld` direct interface is documented as deprecated and superseded by policies, but the corrected direct-rule syntax is still documented. A future revision could replace direct rules with a policy-based example.
- GRE and IPIP tunnels do not encrypt traffic. The post does not claim encryption, but a future revision could emphasize that sensitive traffic should be encrypted separately.
