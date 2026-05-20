# Validation Summary: How to Configure RSS (Receive Side Scaling) on Ubuntu

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Ubuntu Linux networking
- Receive Side Scaling (RSS)
- Receive Packet Steering (RPS)
- Receive Flow Steering (RFS)
- IRQ affinity
- ethtool
- irqbalance
- systemd services
- Netplan
- sysctl
- sysstat / mpstat

## Sources Consulted
- Linux kernel documentation: Scaling in the Linux Networking Stack: https://docs.kernel.org/networking/scaling.html
- Linux kernel documentation: SMP IRQ affinity: https://dri.freedesktop.org/docs/drm/core-api/irq/irq-affinity.html
- ethtool(8) Linux manual page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- systemd.service(5) local man page
- sysctl.d(5) local man page
- mpstat local command output and local man page
- Intel Ethernet 800 Series Linux Performance Tuning Guide, IRQ Affinity section: https://edc.intel.com/content/www/de/de/design/products/ethernet/perf-tuning-guide-800-series-linux/%E2%80%8Birq-affinity/

## Issues Found
- Several examples wrote directly to `/proc` or `/sys` using shell redirection without running the whole shell as root. Changed those examples to use `sudo tee`, so the commands work when run from a normal sudo-capable shell.
- The Netplan note referred to a `driver-settings` extension for queue configuration. Current Netplan documentation exposes some ethtool-style interface settings such as offload toggles, but not a portable RSS channel count setting. Reworded the note to recommend the systemd/ethtool approach.
- The post said the kernel source includes `set_irq_affinity`. Verified that this helper is commonly included with NIC driver packages, such as Intel driver packages, rather than being a general kernel-source helper. Reworded that claim.
- The `mpstat -I SUM -P ALL 1` example reports `intr/s`, not `%irq`. Changed the command to `mpstat -P ALL 1` and updated the text to look at `%irq` and `%soft`.

## Review Notes
The main RSS/RPS/RFS explanations and ethtool command forms were consistent with Linux kernel and ethtool documentation. Queue counts, IRQ distribution, and hash field tuning remain driver-dependent, so users should verify support on the target NIC.
