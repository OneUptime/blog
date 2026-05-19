# Validation Summary: How to Configure LXD Firewall Rules on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- LXD managed bridge networking
- LXD proxy devices
- iptables / netfilter
- nftables
- UFW
- systemd

## Sources Consulted
- LXD bridge network reference: https://documentation.ubuntu.com/lxd/latest/reference/network_bridge/
- LXD firewall configuration guide: https://documentation.ubuntu.com/lxd/latest/howto/network_bridge_firewalld/
- LXD proxy device reference: https://documentation.ubuntu.com/lxd/latest/reference/devices_proxy/
- LXD security documentation for bridged NIC filtering: https://documentation.ubuntu.com/lxd/latest/explanation/security/
- Ubuntu Server UFW firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Local `ufw(8)` man page and `ufw --help`
- Local `iptables` help output from iptables v1.8.10
- Local `/etc/ufw/sysctl.conf` format

## Issues Found
- The post described `ipv4.firewall` and `ipv6.firewall` as disabling all LXD-managed iptables rules. LXD documents these options as filtering firewall controls, while NAT is controlled separately by options such as `ipv4.nat`. I changed the wording to specify filtering rules.
- The DNS allow rules in the outbound restriction example used the `FORWARD` chain with `-o lxdbr0`, but DNS requests to the host bridge address are local host traffic and should be allowed in `INPUT`. I changed those rules to use the `INPUT` chain.
- The established/related return-traffic rule matched `-i lxdbr0`, which is the outbound direction from containers. I changed it to `-o lxdbr0` so it matches replies returning to containers.
- The UFW forwarding example duplicated LXD NAT handling with manual `before.rules` masquerading and used a sysctl replacement for `net.ipv4.ip_forward`, while Ubuntu's UFW sysctl file uses `net/ipv4/ip_forward=1`. I replaced the UFW bridge example with the LXD-documented `ufw allow` and `ufw route allow` commands and corrected the sysctl command.
- The "Use UFW Exclusively" example disabled only IPv4 filtering and included an unnecessary `ufw allow out on lxdbr0`. I added the IPv6 firewall setting and aligned the UFW route rules with LXD documentation.
- The third UFW option appended raw rules to the end of `/etc/ufw/before.rules`, which can put rules outside the required `*filter` table before `COMMIT`. I changed it to instruct adding the rules inside the `*filter` section before the final `COMMIT`.
- The container isolation example used a non-existent LXD network key, `security.macfilter`. LXD documents bridged NIC security as per-NIC keys such as `security.mac_filtering`. I changed the command to use `lxc config device override mycontainer eth0 security.mac_filtering=true`.

## Review Notes
The post remains a practical iptables-oriented guide. On modern Ubuntu, `iptables` often uses the nftables backend, so administrators should be aware that LXD may use nftables directly and that rule ordering can differ between systems. The examples are still valid as iptables-compatible commands, but production deployments should test rule order on the target host.
