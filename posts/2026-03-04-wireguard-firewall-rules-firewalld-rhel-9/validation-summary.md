# Validation Summary: How to Configure WireGuard Firewall Rules with firewalld on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- WireGuard
- firewalld
- firewall-cmd
- nftables
- iptables
- Linux sysctl forwarding

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/red_hat_enterprise_linux-9-configuring_firewalls_and_packet_filters-en-us.pdf
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld policies manual: https://firewalld.org/documentation/man-pages/firewalld.policies.html
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewalld nftables backend documentation: https://firewalld.org/2018/07/nftables-backend
- WireGuard quick start: https://www.wireguard.com/quickstart/
- wg-quick(8) manual: https://www.man7.org/linux/man-pages/man8/wg-quick.8.html

## Issues Found
- The PostUp/PostDown and permanent masquerade examples used `--add-masquerade` without a zone. Since the article configures NAT on the public zone, I changed those commands to explicitly use `--zone=public` so they apply to the intended zone instead of whichever zone is currently the firewalld default.
- The nftables verification command only checked `table ip firewalld`. RHEL 9/firewalld commonly uses the `inet firewalld` table for generated rules, and Red Hat documents checking `inet`, `ip`, and `ip6` firewalld tables. I changed the fallback to check `inet firewalld` first, then `ip firewalld`.

## Review Notes
The remaining firewalld policy, zone, rich rule, masquerade, port, and wg-quick examples match documented syntax. The guide is IPv4-focused for forwarding and masquerading, which is consistent with the commands shown; IPv6 forwarding/NAT would require additional configuration.
