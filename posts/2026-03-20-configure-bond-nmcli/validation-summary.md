# Validation Summary: How to Configure a Bond with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- NetworkManager
- `nmcli`
- Linux bonding driver
- LACP / IEEE 802.3ad

## Sources Consulted
- NetworkManager `nmcli-examples` manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- NetworkManager `nmcli` manual: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager `nm-settings-nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager connection settings reference: https://www.networkmanager.dev/docs/api/latest/settings-connection.html
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html

## Issues Found
- The post used `master` terminology and `master bond0` for member connections. Current NetworkManager documentation marks `master` as deprecated in favor of `controller`, so the member connection commands and the related prose were updated to use `controller`.
- The LACP and round-robin examples both reused `ifname bond0`, which would conflict with the earlier `bond0` example if a reader ran the post in order. These examples were updated to use separate bond interface names (`bond1` and `bond2`).
- The LACP example omitted the requirement for switch-side IEEE 802.3ad/LACP configuration. A brief inline note was added because host-side `nmcli` configuration alone is not sufficient.
- The round-robin example omitted the requirement that member interfaces connect to the same switch and that the switch be configured appropriately for link aggregation/trunking. A brief inline note was added.

## Review Notes
- The local environment has `nmcli` 1.46.0. In this release, `master` still exists as a compatible alias, but current NetworkManager documentation deprecates it in favor of `controller`.
- The examples assume the physical interfaces are named `eth0` and `eth1`; on many modern systems they may use predictable names such as `enp1s0`.
