# Validation Summary: How to Set Interface MTU Values on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux iproute2 `ip link`
- systemd-networkd and `networkctl`
- NetworkManager and `nmcli`
- Debian/Ubuntu `/etc/network/interfaces` with ifupdown
- Netplan
- udev rules
- WireGuard, VXLAN, GRE, Linux bridges, and Docker bridge networking
- Bash and Linux sysfs interface attributes
- iputils `ping`

## Sources Consulted
- ip-link(8), Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- ping(8), iputils manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- systemd.network(5), systemd 254 manual: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- networkctl(1), systemd manual: https://www.freedesktop.org/software/systemd/man/247/networkctl.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Debian ifupdown interfaces(5) manual: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- Debian ifupdown inet.defn source reference: https://sources.debian.org/src/ifupdown/0.8.19/inet.defn
- udev(7), systemd manual: https://www.freedesktop.org/software/systemd/man/udev.html
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker dockerd reference: https://docs.docker.com/reference/cli/dockerd/
- wg-quick(8) manual reference: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8

## Issues Found
- The udev section said the rule takes effect on the next interface up event. The rule uses `ACTION=="add"`, so it is triggered by matching udev add events, not ordinary link-up transitions. Updated the comment to say it takes effect on the next matching udev add event.
- The conclusion recommended testing with `ping -M do` to confirm large packets traverse the path. `ping -M do` only selects the Path MTU Discovery mode; confirming a large packet also requires a destination and an explicit payload size. Updated the command to `ping -M do -s <payload-size> <destination>`.

## Review Notes
The remaining examples are technically valid for the tools and configuration formats they target. They assume appropriate privileges and example interface/connection names. For Netplan with the networkd renderer, the official docs note that setting MTU by interface name alone can be unreliable on renamed devices; matching by MAC address is safer for production configurations.
