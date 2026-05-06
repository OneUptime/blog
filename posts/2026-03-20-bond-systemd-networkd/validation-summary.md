# Validation Summary: How to Configure Network Bonding with systemd-networkd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking
- `systemd-networkd`
- `systemd.netdev` and `systemd.network` configuration
- Linux bonding driver

## Sources Consulted
- systemd.netdev — https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd.network — https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- networkctl — https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- Linux Ethernet Bonding Driver HOWTO — https://docs.kernel.org/networking/bonding.html

## Issues Found
1. **Bond timing values were inconsistent.** The post used `MIIMonitorSec=1s` together with `DownDelaySec=200ms`, but `systemd.netdev` documents that `UpDelaySec=` and `DownDelaySec=` are rounded down to multiples of `MIIMonitorSec=`. With a 1 second monitor interval, `DownDelaySec=200ms` would effectively become `0`. Changed `MIIMonitorSec=1s` to `MIIMonitorSec=100ms` so the example behaves as described.

## Review Notes
- The remaining configuration snippets and commands are valid for `systemd-networkd`: `Bond=` is the correct way to enslave physical interfaces, `Address=`, `Gateway=`, and `DNS=` are valid in the bond interface's `[Network]` section, and `networkctl status bond0` and `/proc/net/bonding/bond0` are appropriate verification steps.
- `802.3ad` mode correctly requires corresponding switch-side LACP configuration.
