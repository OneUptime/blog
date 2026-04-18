# Validation Summary: How to View Bonding Driver Parameters on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux kernel bonding driver
- `/proc/net/bonding/` procfs interface
- `/sys/class/net/<bond>/bonding/` sysfs interface
- `ip` / iproute2 (`ip link`, `ip -d link`)
- `ethtool`
- Bash scripting

## Sources Consulted
- Linux Ethernet Bonding Driver HOWTO — https://www.kernel.org/doc/Documentation/networking/bonding.txt
- Kernel.org Bonding Documentation — https://docs.kernel.org/networking/bonding.html
- iproute2 `ip-link(8)` man page
- ethtool man page

## Issues Found
- **`ip -d link show bond0` output comment was incorrect.** The original post attached the comment `# Includes: bond_slave state ACTIVE mii-status UP link-failure-count 0` to `ip -d link show bond0`. That output format belongs to a **slave** interface, not the bond master. `ip -d link show bond0` actually outputs bond-level parameters like `bond mode`, `miimon`, `updelay`, `downdelay`. Additionally, the iproute2 output uses underscores (`mii_status`, `link_failure_count`, `bond_slave`), not hyphens. **Fix:** Updated the comment for `ip -d link show bond0` to reflect its actual output, and added a separate `ip -d link show eth0` example showing the true `bond_slave` line with correct underscore spelling.

## Review Notes
- The bonding driver version string `v3.7.1 (April 27, 2011)` shown in the `/proc/net/bonding/bond0` example is intentionally retained by the kernel (the `BOND_VERSION` constant has not been bumped), so this remains accurate on current kernels.
- `/sys/class/net/bond0/bonding/mode` correctly outputs both mode name and numeric value (e.g., `active-backup 1`) — verified against kernel docs.
- Kernel documentation has transitioned from the terms "master/slave" to "controller/port" in some places, but the sysfs paths (`slaves`, `active_slave`) and `/proc/net/bonding/` field names (`Slave Interface`) remain as shown. No changes needed.
- The `grep -A5 "Slave Interface: $slave"` pattern in the monitoring script correctly captures the Link Failure Count line (which appears 4 lines after the Slave Interface header).
