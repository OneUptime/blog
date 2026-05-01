# Validation Summary: How to Disable IPv6 on Linux with sysctl

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IPv6
- `sysctl`
- Netplan
- NetworkManager (`nmcli`)
- `iproute2` (`ip`, `ss`)

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Netplan tutorial: https://netplan.readthedocs.io/en/stable/netplan-tutorial/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Local CLI help output: `sysctl --help`, `nmcli connection modify --help`, `nmcli connection up --help`, `ss --help`

## Issues Found
- The temporary `sysctl` section treated `net.ipv6.conf.default.disable_ipv6` and `net.ipv6.conf.lo.disable_ipv6` as additional required steps after setting `net.ipv6.conf.all.disable_ipv6=1`. The kernel documentation states that writing `conf/all/disable_ipv6` also writes `conf/default/disable_ipv6` and all per-interface `disable_ipv6` values, so I changed the example to present interface-specific and loopback commands as optional alternatives instead of required follow-up commands.
- The Ubuntu section described the Netplan example too broadly. Netplan documents this style of configuration as disabling IPv6 on a specific interface / disabling automatic IPv6 configuration there, so I narrowed the wording and corrected the `link-local` comment to match what `link-local: []` actually does.
- The RHEL/CentOS/Fedora NetworkManager example used `eth0` as the target of `nmcli connection modify` and `nmcli connection up`. Those commands operate on a connection profile name, UUID, or D-Bus path, not an interface name, so I changed the example to use `"<connection-name>"`.
- The verification section used `dig AAAA google.com @::1` as a test. That depends on a DNS server listening on `::1`, so it is not a reliable way to verify IPv6 is disabled. I replaced it with an IPv6 route-table check and also made the sysctl verification less narrow.
- The re-enable section only removed `/etc/sysctl.d/99-disable-ipv6.conf`, which would not be enough if the reader had also added settings to `/etc/sysctl.conf`. I clarified that persistent `disable_ipv6` settings must be removed or commented out before reloading sysctl settings.

## Review Notes
- The main system-wide mechanism in this post is the `sysctl` setting. The Netplan and NetworkManager examples are interface/profile-level configuration examples, not the same thing as disabling the IPv6 kernel module with `ipv6.disable=1`.
- The kernel documentation notes that reading `net.ipv6.conf.all.disable_ipv6` alone is not a definitive global status indicator, so checking actual IPv6 addresses and routes is the stronger verification step.
