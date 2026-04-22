# Validation Summary: How to Set a Default Gateway on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux routing
- iproute2 / `ip route`
- DHCP / `dhclient`
- Netplan
- NetworkManager / `nmcli`
- systemd-networkd
- Debian ifupdown `/etc/network/interfaces`

## Sources Consulted
- iproute2 `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local `ip route help` and `ip route show default` output
- Netplan YAML configuration documentation: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Red Hat Enterprise Linux documentation for managing default gateways with `nmcli`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/managing-the-default-gateway-setting_configuring-and-managing-networking
- NetworkManager `nmcli connection modify help` and `nmcli connection up help` output
- systemd.network manual page: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- Debian ifupdown `interfaces(5)` manual page: https://manpages.debian.org/bullseye/ifupdown/interfaces.5.en.html
- ISC DHCP `dhclient` manual page: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhclient
- ISC DHCP `dhclient-script` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient-script

## Issues Found
- The introduction said that without a default gateway a host can only communicate with directly connected networks. This was too absolute because explicitly configured non-default routes can still be used. Changed it to say the host is typically limited to directly connected networks and explicitly configured routes.
- The `default` route comment did not specify IPv4. Changed it to clarify that, for IPv4, `default` is equivalent to `0.0.0.0/0`.
- The `ip route show` comment said the default route may appear as `0.0.0.0/0` or `default`. Current `ip route` output normally displays it as `default`, so the comment was corrected.
- The DHCP wording said the gateway is provided automatically. DHCP can provide a default router when the server supplies that option, so the wording was changed to "can be provided automatically by the DHCP server."
- The `dhclient eth0` comment described the command as renewing a lease. The command starts or requests DHCP configuration for the interface; it is not specifically a renewal command in every setup. Changed the comment to "Requests a DHCP lease including gateway information."
- The `nmcli` example used `eth0` where `nmcli connection modify` and `nmcli connection up` expect a connection profile name, UUID, or path. Changed the example to use `"<connection-name>"`.

## Review Notes
- The remaining commands and configuration snippets are syntactically valid for their respective tools.
- Route changes made with `ip route` are runtime changes and require root/CAP_NET_ADMIN privileges; the post already points readers to persistent network-manager configuration for production use.
- The `nmcli` gateway command assumes the connection profile already has an appropriate static IPv4 configuration; otherwise `ipv4.addresses` and `ipv4.method manual` also need to be configured.
- Interface names such as `eth0` are examples. Modern distributions often use predictable names like `enp0s3`, `ens160`, or `eno1`.
- `dhclient` may not be installed or may not be the active DHCP client on systems managed by NetworkManager or systemd-networkd.
