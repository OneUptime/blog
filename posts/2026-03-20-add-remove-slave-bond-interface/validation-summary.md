# Validation Summary: How to Add and Remove Slave Interfaces from a Bond

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bonding driver
- `iproute2` / `ip link`
- NetworkManager / `nmcli`
- Debian `ifupdown` `/etc/network/interfaces`
- `ifenslave`

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- NetworkManager settings reference (`connection.controller`, `connection.master`, `connection.slave-type`): https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Red Hat Enterprise Linux 10 bonding with `nmcli`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_networking/configuring-a-network-bond
- Debian `ifenslave` README: https://sources.debian.org/src/ifenslave/2.13/debian/README.Debian
- Debian `ifenslave(8)` man page: https://manpages.debian.org/stretch/ifenslave/ifenslave.8.en.html
- Debian `ip-link(8)` man page: https://manpages.debian.org/trixie/iproute2/ip-link.8.en.html
- Verified author link: https://github.com/nawazdhandala

## Issues Found
- The post stated that an interface must be brought down before `ip link set <iface> master <bond>`. The kernel bonding documentation shows enslaving via `ip link` and sysfs without that requirement, so I changed the wording to make the pre-down step an optional precaution instead of a hard requirement.
- The live active-backup procedure implied a manual failover was required before removing the active slave. Bonding will fail over automatically if another usable slave exists, so I changed the wording to present manual failover as an optional risk-reduction step and clarified that the chosen target slave must already be enslaved and have link up.
- The example verification commands used the loose grep pattern `Active Slave`. I updated the active-backup example to use the exact `Currently Active Slave` field name from `/proc/net/bonding/<bond>`.
- The sample `/proc/net/bonding` output incorrectly appended `(primary_reselect failure)` to the `Primary Slave` line. I removed that suffix because `primary_reselect` is a separate bond option, not part of that output field.
- The NetworkManager example used `master bond0`. Current NetworkManager documentation deprecates `connection.master` in favor of `connection.controller`, so I updated the `nmcli connection add` example to use `controller bond0`.

## Review Notes
- `ifenslave` is correctly treated as legacy in the post. On some modern distributions, especially Debian-family systems, bonding is primarily managed through `iproute2`, NetworkManager, or ifupdown hooks, and the standalone `ifenslave` command may not be installed by default.
- Current Red Hat documentation uses `controller` / `port-type` terminology for bond ports. Older RHEL and older `nmcli` builds commonly show `master` / `slave-type`; those older names remain useful as compatibility context, but the post now uses the current naming.
- Interface names such as `eth0`, `eth1`, and `eth2` are illustrative. On many current systems they may instead be predictable names such as `ens160` or `enp3s0`.
