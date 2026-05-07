# Validation Summary: How to Configure Container Network Bonding with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman bridge and macvlan networking
- Linux bonding driver
- NetworkManager and nmcli
- Linux bridges
- systemd user timers

## Sources Consulted
- Podman `podman-network-create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-network-inspect` official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- NetworkManager `nmcli-examples` official documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- NetworkManager `nm-settings-nmcli` official documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Linux kernel bonding driver documentation: https://www.kernel.org/doc/html/v6.7/networking/bonding.html

## Issues Found
- The NetworkManager examples used older slave-oriented naming and `master` attachment syntax. Updated the bond and bridge examples to use current controller/port terminology with `controller` and `port-type`, matching current NetworkManager documentation.
- The bonded bridge example assigned `192.168.1.100/24` to the bridge after the earlier bond example had already assigned the same address to `bond0`. Added commands to disable IP configuration on the bond profile before assigning the address to `br-bond0`.
- The Podman bonded bridge example wrote a network JSON file directly under `/etc/containers/networks`. Replaced it with the supported `podman network create` command using `--interface-name br-bond0` and `--opt mode=unmanaged` for an existing Linux bridge.
- Several `podman network create` examples placed the network name before flags. Reordered them to match the documented command form.
- The failover test used `curl http://localhost`, which only works for a service published on localhost. Changed it to test the bonded host address used in the examples.

## Review Notes
- Podman was not installed in the local environment, so Podman CLI validation was performed against official Podman documentation rather than local `--help` output.
- The macvlan example is valid for rootful Podman. Current Podman documentation notes that rootless macvlan and ipvlan networks cannot access host network interfaces.
