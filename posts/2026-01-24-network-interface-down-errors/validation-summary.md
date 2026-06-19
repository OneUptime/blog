# Validation Summary: How to Fix 'Network Interface Down' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux network interfaces
- iproute2 (`ip link`, `ip addr`, `ip netns`)
- ethtool
- systemd journal and `journalctl`
- NetworkManager and `nmcli`
- systemd-networkd and `networkctl`
- Debian ifupdown `/etc/network/interfaces`
- PCI/USB device inspection (`lspci`, `lsusb`)
- Linux kernel modules and firmware (`modprobe`, `lsmod`)
- Linux bonding and teamd
- Bash troubleshooting scripts
- Linux sysfs network interface attributes

## Sources Consulted
- ip-link(8), iproute2 manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- ip-netns(8), iproute2 manual: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- ethtool(8) manual: https://man7.org/linux/man-pages/man8/ethtool.8.html
- NetworkManager nmcli settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager nmcli examples: https://networkmanager.dev/docs/api/1.44.4/nmcli-examples.html
- systemd.network manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- networkctl(1) manual: https://man7.org/linux/man-pages/man1/networkctl.1.html
- `/etc/network/interfaces` / ifupdown manual: https://manpages.ubuntu.com/manpages/focal/man5/interfaces.5.html
- Linux kernel sysfs network ABI: https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-class-net
- Linux kernel interface statistics documentation: https://docs.kernel.org/networking/statistics.html
- modprobe(8) manual: https://man7.org/linux/man-pages/man8/modprobe.8.html
- Red Hat teamdctl documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-controlling_teamd_with_teamdctl
- Local command help/version checks for `ip`, `nmcli`, `networkctl`, and `ethtool`.

## Issues Found
- Corrected the description of `NO-CARRIER`: it is shown by `ip link` as a link flag/condition, while the `state` field uses operational states such as `UP`, `DOWN`, and related values.
- Replaced root-owned file writes using `cat > /etc/...` with `sudo tee ... > /dev/null` so the examples work from a normal sudo-capable shell.
- Added `sudo` to privileged service, interface, and namespace operations where the examples previously implied non-root execution.
- Clarified `RequiredForOnline=yes`: it affects `systemd-networkd-wait-online` and `network-online.target`; it does not itself wait for physical link detection.
- Corrected the teamd status command from `teamdctl team0 state` to `teamdctl team0 state view`, matching Red Hat's documented syntax.
- Added a root check to the recovery script because it writes to `/var/log`, loads modules, changes link state, and invokes DHCP.
- Initialized the monitoring script's per-interface error counters inside the loop so a later interface without sysfs statistics cannot reuse a previous interface's values.

## Review Notes
- The commands are Linux-specific and assume the relevant packages are installed (`iproute2`, `ethtool`, NetworkManager, systemd-networkd, ifupdown, pciutils, usbutils, teamd, and a DHCP client as applicable).
- Some distributions no longer use traditional `/etc/network/interfaces` by default, but the syntax remains valid for Debian/Ubuntu systems using ifupdown.
- `dhclient` is not universal on modern NetworkManager/systemd-networkd systems, but the recovery script labels it as a simple automated recovery example rather than a cross-distribution framework.
