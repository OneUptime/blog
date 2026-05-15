# Validation Summary: How to Configure a Network Bridge with nmcli on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager
- nmcli
- Linux bridge interfaces
- Spanning Tree Protocol (STP)
- iproute2 bridge utility

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring a network bridge by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- NetworkManager nmcli manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager bridge settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/settings-bridge.html
- Local command help/man pages: `nmcli --version`, `nmcli connection add help`, `nmcli connection modify help`, `man nm-settings-nmcli`, `man nmcli`, `bridge -V`, `bridge link help`, `bridge fdb help`

## Issues Found
- The bridge port creation examples used the older `master br0` syntax. Current RHEL 9.4+ documentation uses `port-type bridge` and `controller br0`, so the examples were updated to match the current documented syntax.
- The forward-delay example described 4 seconds as the minimum with STP. NetworkManager documents `bridge.forward-delay` as accepting values in the `0 - 30` range, while `nmcli connection add help` constrains bridge creation to `2 - 30`. The example command is valid, but the "minimum" wording was removed.

## Review Notes
- The post is technically relevant and contains executable networking commands, so it was reviewed as a code/technical tutorial.
- The examples assume the physical interface names (`eth0`, `eth1`) exist and that changing them will not disconnect the administrator. Production RHEL systems commonly use predictable names such as `enp7s0`; readers should substitute their real device names.
- The bridge activation examples are consistent with Red Hat's documented `nmcli connection up bridge0` flow. NetworkManager may need `connection.autoconnect-ports` tuning in environments where controller activation does not automatically activate port profiles.
