# Validation Summary: How to Make IPv4 Address Changes Persistent Across Reboots on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IPv4 addressing
- Netplan
- ifupdown and `/etc/network/interfaces`
- NetworkManager and `nmcli`
- systemd-networkd
- Legacy RHEL/CentOS `ifcfg` files

## Sources Consulted
- Netplan tutorial: https://netplan.readthedocs.io/en/1.0/netplan-tutorial/
- `netplan try` documentation: https://netplan.readthedocs.io/en/1.1.2/netplan-try/
- Debian `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Debian `resolvconf(8)` man page: https://manpages.debian.org/testing/resolvconf/resolvconf.8.en.html
- NetworkManager `nm-settings-nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager `nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager keyfile plugin reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-keyfile.html
- NetworkManager configuration reference: https://www.networkmanager.dev/docs/api/latest/NetworkManager.conf.html
- `systemd.network` reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `networkctl` reference: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `systemd-resolved` reference: https://www.freedesktop.org/software/systemd/man/253/systemd-resolved.html
- RHEL 8 `ifcfg` documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/system_design_guide/configuring-ip-networking-with-ifcfg-files_system-design-guide
- RHEL 7 `Using NetworkManager with sysconfig files`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-using_networkmanager_with_sysconfig_files
- RHEL 9 release notes on `ifcfg` deprecation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/deprecated-functionalities

## Issues Found
- The Netplan command order was misleading. The post showed `netplan apply` before `netplan try`, even though `netplan try` is the command that performs a temporary, auto-reverting test. I reordered the commands so the safe test path appears first.
- The `/etc/network/interfaces` example used a deprecated `netmask` field for IPv4 static configuration. I changed the example to use CIDR notation in the `address` field, which matches current `interfaces(5)` guidance.
- The `/etc/network/interfaces` example implied `dns-nameservers` works universally with ifupdown. I kept the directive but added a note that it requires `resolvconf` or another ifupdown DNS hook.
- The NetworkManager section stated that the connection is stored in `/etc/NetworkManager/system-connections/` as an absolute rule. I narrowed that claim to the default keyfile-based system-connection case, which matches the official NetworkManager documentation.
- The systemd-networkd section omitted the fact that `DNS=` entries are consumed by `systemd-resolved`. I updated the activation command to enable `systemd-resolved` alongside `systemd-networkd` and added a note explaining that dependency.
- The legacy RHEL/CentOS `ifcfg` example used `BOOTPROTO=static`, which does not match Red Hat’s documented static IPv4 examples. I changed it to `BOOTPROTO=none`.
- The legacy `ifcfg` example set `DNS1` without disabling peer DNS handling. I added `PEERDNS=no` and a second DNS entry so the static DNS example matches Red Hat’s documented pattern.
- The legacy `ifcfg` activation example used a generic reload plus `nmcli con up eth0`, but the file did not define a matching connection name. I added `NAME=eth0`, added `TYPE=Ethernet`, and changed the reload step to `nmcli connection load /etc/sysconfig/network-scripts/ifcfg-eth0`, which is the documented way to load a manually edited `ifcfg` file into NetworkManager.
- The RHEL/CentOS `ifcfg` method was presented without acknowledging its legacy status. I relabeled it as a legacy method because network scripts are deprecated in RHEL 8 and `ifcfg` connection profiles are deprecated in RHEL 9.

## Review Notes
- No remaining blocking technical issues were found after the corrections.
- The post uses `eth0` as a placeholder interface name. On many modern Linux systems, the real interface name will be something like `enp1s0` or `ens3`.
- The legacy RHEL/CentOS `ifcfg` approach is still useful for older systems, but new RHEL releases prefer NetworkManager keyfiles and `nmcli`.
