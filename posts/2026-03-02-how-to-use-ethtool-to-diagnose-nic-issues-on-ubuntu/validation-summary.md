# Validation Summary: How to Use ethtool to Diagnose NIC Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ethtool (network interface diagnostic tool)
- Ubuntu Linux
- Netplan (network configuration)
- udev rules
- systemd services
- NIC drivers (virtio_net, e1000, igb, r8169)
- Linux network offloads (TSO, GSO, GRO)
- Ring buffer tuning

## Sources Consulted
- ethtool(8) man page (ethtool version 6.7)
- Netplan reference documentation (https://netplan.readthedocs.io/en/stable/netplan-yaml/)
- Linux kernel documentation on network device statistics
- udev(7) and systemd.service(5) documentation
- Ubuntu package documentation for the `ethtool` package

## Issues Found
1. **Misleading Netplan example for persisting speed/duplex** — The section "To make speed changes persistent with Netplan" contained a YAML snippet that did not actually set any speed/duplex/autoneg values. Netplan's schema does not support `speed`, `duplex`, or `autoneg` keys, so this example was both incorrect (didn't do what the heading claimed) and misleading. Replaced with an accurate statement that Netplan does not natively support these settings, and that a udev rule or systemd service must be used instead.
2. **Incorrect reference to Netplan in the ring buffer section** — The line "Make it persistent by adding to the Netplan configuration or a network configuration script" wrongly suggested Netplan could persist ring buffer sizes. Netplan does not support `ethtool -G` ring parameters either. Corrected to recommend a systemd service or udev rule.

## Review Notes
- All ethtool command-line flags and short options used in the post (`-s`, `-i`, `-S`, `-g`, `-G`, `-k`, `-K`, `-t`, `--version`) verified against the ethtool 6.7 man page.
- Offload short names (`tso`, `gro`) and full feature names (`tcp-segmentation-offload`, `generic-receive-offload`, etc.) are correct.
- The `Supports Wake-on: pumbg` and `Wake-on: d` example output values are valid Wake-on-LAN flag characters.
- The ring buffer field labels (`RX`, `RX Mini`, `RX Jumbo`, `TX`) match real ethtool output formatting.
- The udev rule uses `/sbin/ethtool`; on modern Ubuntu `/sbin` is a symlink to `/usr/sbin`, so the path still resolves correctly. Left as-is.
- The interpretations of error counters (rx_crc_errors, rx_fifo_errors, tx_carrier_errors, rx_dropped, rx_missed_errors) accurately reflect their semantics in standard NIC drivers.
- Minor caveat (not changed): on cloud/virtualized environments many of the speed/duplex/ring buffer commands return "Operation not supported" because virtio_net and similar drivers don't expose those controls. The post does mention virtio_net as a driver name but doesn't explicitly call out this limitation.
