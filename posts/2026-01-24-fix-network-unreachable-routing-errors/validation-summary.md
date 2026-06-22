# Validation Summary: How to Fix 'Network Unreachable' Routing Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- iproute2 `ip link`, `ip addr`, `ip route`, and network namespaces
- net-tools `ifconfig`, `route`, and `arp`
- DHCP client troubleshooting
- Netplan
- NetworkManager and `nmcli`
- RHEL/CentOS legacy network-scripts
- systemd-resolved and `/etc/resolv.conf`
- Docker networking
- OpenVPN tunnel routing
- `ping`, `traceroute`, `mtr`, `ethtool`, and `arping`

## Sources Consulted
- iproute2 `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iproute2 `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Netplan YAML documentation: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nmcli` examples: https://www.networkmanager.dev/docs/api/latest/nmcli-examples.html
- NetworkManager settings reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Red Hat Enterprise Linux 8 static route documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-static-routes_configuring-and-managing-networking
- Red Hat Enterprise Linux 8 legacy network scripts documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/assembly_legacy-network-scripts-support-in-rhel_configuring-and-managing-networking
- Docker network prune documentation: https://docs.docker.com/reference/cli/docker/network/prune/
- Docker pruning documentation: https://docs.docker.com/engine/manage-resources/pruning/
- `resolv.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- `resolvectl --help` and local systemd-resolved command help
- Local man pages for `ip-netns(8)`, `ethtool(8)`, `nm-settings-nmcli(5)`, and `nmcli-examples(7)`

## Issues Found
- The RHEL/CentOS legacy network-scripts section restarted NetworkManager even though the snippet described legacy ifcfg/network-scripts configuration. Changed the section title and restart command to use the legacy `network` service.
- The Netplan persistent static routes snippet omitted `version: 2`, which is required in normal Netplan YAML configuration. Added it.
- The RHEL/CentOS static route file used `ip route`-style syntax for IPv4 routes. Changed it to the documented legacy network-scripts key-value format with `ADDRESS`, `NETMASK`, and `GATEWAY` entries.
- The DNS fix implied direct `/etc/resolv.conf` editing was a durable fix on managed systems. Reworded it as a temporary DNS test and added `resolvectl dns eth0 8.8.8.8` for systemd-resolved.
- The Docker section described `docker network prune` as resetting Docker networking. Updated the wording because Docker documents it as removing unused networks.
- The diagnostic script attempted to ping an empty gateway value when no default route existed. Added a gateway variable and guard so the script reports gateway failure cleanly.

## Review Notes
Most command examples were technically correct and aligned with current Linux tooling. The post still intentionally uses common placeholder interface names such as `eth0`; readers on modern distributions may need to substitute names like `enp0s3`, `ens33`, or `wlp*`.
