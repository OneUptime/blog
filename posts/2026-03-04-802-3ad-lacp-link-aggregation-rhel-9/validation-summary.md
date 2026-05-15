# Validation Summary: How to Set Up 802.3ad LACP Link Aggregation on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager and nmcli
- Linux bonding driver
- IEEE 802.3ad / 802.1AX link aggregation
- LACP
- Cisco-style switch port-channel configuration
- tcpdump and Linux network verification commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring a network bond": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Linux kernel documentation, "Linux Ethernet Bonding Driver HOWTO": https://docs.kernel.org/networking/bonding.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local nmcli help output from NetworkManager 1.46.0 for command syntax cross-checking

## Issues Found
- The post described 802.3ad as "also known as LACP." I changed this to say that 802.3ad mode uses LACP, because LACP is the negotiation protocol used by dynamic link aggregation rather than an exact synonym for the whole bonding mode.
- The post said `lacp_rate=fast` sends local LACP PDUs every second and that the switch-side LACP rate must match. I changed the wording to match the Linux bonding behavior: `lacp_rate` requests the partner's LACPDU transmission rate, and fast/slow rate settings do not need to be treated as a mandatory matching parameter.
- The post recommended `xmit_hash_policy=layer3+4` as the best general choice without noting standards compliance. I added the Red Hat/kernel caveat that `layer3+4` is not fully 802.3ad compliant and should be used only when the switch tolerates it.
- The RHEL 9 port-add examples used older `master` / slave terminology. I updated the commands to the current Red Hat-documented `port-type bond` and `controller bond0` syntax, and added `connection.autoconnect-ports 1` so the bond ports are activated with the bond.
- The "Adding More Slaves" command implied that a newly added interface is picked up automatically. I changed it to bring up the new port explicitly before checking `/proc/net/bonding/bond0`.
- The troubleshooting advice for all traffic using one link jumped directly from `layer2` to `layer3+4`. I changed it to recommend `layer2+3` first for gateway-heavy traffic, with `layer3+4` only when port-based distribution is needed and compatible.

## Review Notes
The remaining command examples are syntactically valid for the documented workflow. The Cisco-style switch snippet is intentionally conceptual and vendor-specific, so it was reviewed only for plausibility rather than as complete production switch configuration.
