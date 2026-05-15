# Validation Summary: How to Configure VLAN Interfaces with nmcli on RHEL

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- VLAN tagging / IEEE 802.1Q
- Linux networking and routing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring VLAN tagging": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-vlan-tagging_configuring-and-managing-networking
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local `nmcli` 1.46.0 command help: `nmcli connection add help`, `nmcli connection modify help`
- Local `nm-settings-nmcli` man page

## Issues Found
- The VLAN priority section described both ingress and egress mappings as socket-to-VLAN priority mappings. NetworkManager defines `vlan.ingress-priority-map` as incoming 802.1p priority to Linux packet priority, and `vlan.egress-priority-map` as Linux packet priority to outgoing 802.1p priority. Updated the comments to describe the correct direction for each map.

## Review Notes
The `eth0` interface name is valid as an example, but RHEL 9 systems often use predictable interface names such as `enp1s0`; readers should substitute their actual parent interface name from `nmcli device status`.
