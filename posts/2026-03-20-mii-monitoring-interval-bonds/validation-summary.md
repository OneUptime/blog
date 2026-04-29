# Validation Summary: How to Set the MII Monitoring Interval for Network Bonds

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel bonding driver (MII link monitoring)
- sysfs `/sys/class/net/<bond>/bonding/*` interface
- `/proc/net/bonding/<bond>` status file
- iproute2 (`ip link`) bond creation/configuration
- Netplan bond configuration
- NetworkManager / `nmcli` bond options
- ARP link monitoring (alternative to MII)

## Sources Consulted
- Linux kernel bonding documentation: https://www.kernel.org/doc/Documentation/networking/bonding.rst
  - Section on `miimon` default value
  - Section on `updelay`/`downdelay` rounding behaviour
  - sysfs runtime configuration examples (including `arp_ip_target` `+` prefix)
  - `/proc/net/bonding/<bond>` example output
- iproute2 source `ip/iplink_bond.c` (bond-type argument list for `ip link add`): https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/ip/iplink_bond.c
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/ (bond `parameters` field names)
- Red Hat RHEL 9 — Configuring network bonding with nmcli: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- NetworkManager nm-settings: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html

## Issues Found

1. **`miimon` default value was wrong.** The "Key MII Parameters" table listed the default as `0 (disabled)`, and the conclusion repeated `default=0`. Per the upstream kernel bonding doc the default is **100** when `arp_interval` is not set (zero only means MII monitoring is disabled if explicitly configured). Updated the table entry to `100 (if arp_interval is unset; 0 disables)` and rewrote the conclusion so it no longer claims that failover does not work by default — instead it explains that setting `miimon=0` is what disables MII monitoring.

2. **ARP IP target sysfs syntax was missing the `+` prefix.** The post showed `echo 192.168.1.1 > /sys/class/net/bond0/bonding/arp_ip_target`. The kernel docs explicitly require a leading `+` to add an ARP target (and `-` to remove) via the sysfs interface; without the prefix the write does not behave as documented. Changed to `echo +192.168.1.1 > /sys/class/net/bond0/bonding/arp_ip_target`.

3. **Rounding wording in the conclusion.** The post originally stated only that the values "should be multiples of `miimon`". The kernel doc is more specific: non-multiples are rounded **down** to the nearest multiple of `miimon`. Added that clarification while rewriting the conclusion paragraph.

## Review Notes

- All other technical content was confirmed against the official sources:
  - sysfs paths under `/sys/class/net/bond0/bonding/{miimon,updelay,downdelay,arp_interval,arp_ip_target}` are correct.
  - `ip link add bond0 type bond mode active-backup miimon 100` is valid iproute2 syntax (verified against `iplink_bond.c`).
  - Netplan field names `mii-monitor-interval`, `up-delay`, `down-delay` under `bonds.<name>.parameters` match the Netplan reference.
  - `nmcli connection modify ... bond.options "mode=active-backup,miimon=100,updelay=200,downdelay=200"` is the documented comma-separated key=value form.
  - The `/proc/net/bonding/bond0` field labels ("MII Polling Interval (ms)", "Up Delay (ms)", "Down Delay (ms)") match the kernel-documented output verbatim.
- `ip link set bond0 type bond miimon 100` for changing parameters on a *live* bond is technically supported by netlink/iproute2, but the kernel bonding doc only shows runtime tuning via sysfs. This is not incorrect, just worth noting if readers run into edge cases — sysfs is the more battle-tested path for live changes.
- The recommended-values block is internally consistent: 100/100/200 and 100/2000/2000 are all valid multiples of `miimon=100`.
