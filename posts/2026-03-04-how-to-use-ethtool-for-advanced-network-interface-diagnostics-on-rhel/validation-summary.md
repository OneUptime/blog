# Validation Summary: How to Use ethtool for Advanced Network Interface Diagnostics on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- ethtool
- Linux network interfaces
- NIC driver, firmware, offload, queue, ring buffer, PHY, EEPROM, and statistics diagnostics
- dnf package installation

## Sources Consulted
- Local `ethtool --help` output for ethtool 6.7
- Local `man ethtool` manpage
- Linux kernel documentation: Interface statistics, https://www.kernel.org/doc/html/latest/networking/statistics.html
- Kernel.org ethtool project page, https://www.kernel.org/pub/software/network/ethtool/
- Red Hat Customer Portal ethtool overview, https://access.redhat.com/solutions/177273

## Issues Found
- The introduction said ethtool diagnostics are "not available" through standard tools like `ip` or `nmcli`. This was too broad because some interface information and standard statistics are available through other tools. Changed it to say ethtool provides "many low-level driver and hardware diagnostics" not available through those tools.
- The `ethtool -S ens192` comment said it views "all NIC-level statistics." The ethtool manpage describes `-S` as showing standard or NIC- and driver-specific statistics, with NIC- and driver-specific statistics requested when no group is specified. Changed the comment to "View NIC- and driver-specific statistics."

## Review Notes
- All listed ethtool commands and flags were present in the checked ethtool 6.7 help/manpage.
- Several commands depend on NIC driver and hardware support, so they can return unsupported-operation errors on some interfaces even though the syntax is correct.
- `dnf` was not available in this local container, but `sudo dnf install -y ethtool` is appropriate for RHEL-family systems using DNF.
