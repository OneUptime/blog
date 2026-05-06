# Validation Summary: How to Configure a Bridge with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- NetworkManager
- `nmcli`
- Linux bridge interfaces
- Spanning Tree Protocol (STP)
- KVM host networking
- `iproute2` (`ip` and `bridge`)

## Sources Consulted
- NetworkManager Reference Manual, `nmcli`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager Reference Manual, `nmcli-examples`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- NetworkManager Reference Manual, `nm-settings-nmcli`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager Reference Manual, `bridge` settings: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/settings-bridge.html
- Local CLI help and command validation: `nmcli --version`, `nmcli connection add help`, `nmcli connection modify help`, `ip link help`, `bridge link help`

## Issues Found
- The post used older bridge `master` / “slave” terminology. I updated the prose and example connection names to current NetworkManager controller / port terminology, and changed the examples to use `controller br0`, which matches current upstream `nmcli` examples.
- The DHCP section could be read as a second sequential `nmcli connection add` for the same `br0` profile after the static-IP example. I clarified that the DHCP example is an alternative to the static IPv4 setup, not an additional step to run afterward.

## Review Notes
- The bridge creation, activation, STP, and verification commands are technically valid after the terminology update.
- `bridge.stp`, `bridge.forward-delay`, and `bridge.hello-time` are current bridge properties in NetworkManager.
- Local `nmcli` 1.46.0 help still exposes older `master` / `slave-type` add syntax for compatibility, while the settings reference marks `slave-type` as deprecated in favor of `port-type` and current upstream examples use controller / port wording.
- Interface names such as `eth0` and `eth1` remain environment-specific placeholders.
