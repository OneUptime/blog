# Validation Summary: How to Enable Predictable Network Interface Names on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-udevd predictable network interface naming
- udev rules
- biosdevname
- NetworkManager and nmcli
- grubby kernel argument management
- iproute2 and ethtool

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Implementing consistent network interface naming": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/consistent-network-interface-device-naming_configuring-and-managing-networking
- systemd.net-naming-scheme(7) local man page
- systemd.link(5) local man page and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.link.html
- udev(7) local man page
- Local CLI help for `udevadm`, `nmcli connection`, `ip link`, and `ethtool`

## Issues Found
- The post described MAC-address-based names as part of the default priority order. RHEL 9 generates `ID_NET_NAME_MAC`, but its default `NamePolicy` is `keep kernel database onboard slot path`, so the `mac` policy is not selected unless an administrator enables it. Updated the explanation, diagram, table, and candidate-selection text.
- The command labeled as showing the applied naming scheme only listed `ID_NET_NAME_*` candidates. Added the documented `ID_NET_NAMING_SCHEME` query and kept the candidate-listing command separately.
- The biosdevname section incorrectly implied systemd naming usually takes precedence over biosdevname. Red Hat documents the Dell-only biosdevname udev rule as running before `net_setup_link`, so the text now reflects that ordering.
- The custom udev examples omitted `ATTR{type}=="1"` and used a non-recommended filename for boot-time consistency. Updated the examples to use `70-persistent-net.rules` and include the Ethernet device type match.
- The post said `/etc/udev/rules.d/` rules generally take priority over `/usr/lib/udev/rules.d/`. udev processes rules lexically across all rule directories, while `/etc` only overrides same-named files from `/usr/lib`. Updated the text to describe the actual ordering.

## Review Notes
- The remaining commands and configuration snippets are syntactically valid according to the available local CLI help and man pages.
- Red Hat generally does not support systems where consistent device naming is disabled, so reverting to `eth0` should remain a last-resort compatibility option.
