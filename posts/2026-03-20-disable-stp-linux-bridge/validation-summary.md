# Validation Summary: How to Disable STP on a Linux Bridge

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bridge
- Spanning Tree Protocol (STP)
- iproute2 (`ip`)
- `brctl` / bridge-utils
- Netplan
- NetworkManager (`nmcli`)
- systemd-networkd
- ifupdown (`/etc/network/interfaces`)
- KVM networking

## Sources Consulted
- Linux kernel bridge documentation: https://kernel.org/doc/html/next/networking/bridge.html
- Netplan YAML configuration reference: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- NetworkManager bridge settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/settings-bridge.html
- systemd.netdev manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- Debian `brctl(8)` man page: https://manpages.debian.org/bookworm/bridge-utils/brctl.8.en.html
- Debian `bridge-utils-interfaces(5)` man page: https://manpages.debian.org/bookworm/bridge-utils/bridge-utils-interfaces.5.en.html
- Local installed manuals used to verify command syntax and option ranges: `ip-link(8)` from iproute2 6.1.0, `nm-settings-nmcli(5)` from NetworkManager 1.46.0, and `systemd.netdev(5)` from systemd 255

## Issues Found
- The runtime section incorrectly told readers to always set `forward_delay` to `0` after disabling STP. I removed that guidance because the kernel bridge documentation and `ip-link(8)` document `forward_delay` as relevant only when STP is enabled.
- The Netplan example was not a complete valid Netplan document. I added the required top-level `network:` structure, `version: 2`, and a declaration for `eth0`, and removed the unnecessary `forward-delay` setting.
- The `brctl show` verification comment did not match the command's actual output format. I changed it to tell readers to check the `STP enabled` column.
- Several claims were too absolute. I changed them to reflect that STP can add up to 30 seconds before forwarding and that disabling STP is only safe when there is no alternate Layer 2 loop path.

## Review Notes
- The Linux kernel bridge default is `stp_state=0` (disabled), but some higher-level Linux network managers enable STP by default for bridge profiles. The revised introduction now reflects that distinction.
- `brctl` is obsolete according to its man page. The post already labels it as a legacy tool, which is appropriate.
- The systemd-networkd example correctly shows where `STP=no` is configured for the bridge device, but a full working bridge setup still requires the corresponding `.network` files to attach interfaces and assign addressing.
