# Validation Summary: How to Monitor DHCP Lease Activity on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ISC DHCP server (`isc-dhcp-server` / `dhcpd`)
- Kea DHCP server (REST API via Control Agent)
- Ubuntu system logs (`/var/log/syslog`, `journalctl`)
- `awk`, `comm`, shell scripting
- Python 3 (`urllib.request`, `json`)
- `dhcpdump`
- `cron`, `logrotate`

## Sources Consulted
- Kea Administrator Reference Manual (stat_cmds hooks library): https://kea.readthedocs.io/en/kea-2.4.0/arm/dhcp4-srv.html
- Kea Stat Commands Hooks Library (dev guide): https://reports.kea.isc.org/dev_guide/d1/d88/libdhcp_stat_cmds.html
- Kea 2.2.0 API Reference: https://kea.readthedocs.io/en/kea-2.2.0/api.html
- ISC DHCP `dhcpd.leases(5)` documentation (lease file format)
- Ubuntu package documentation for `isc-dhcp-server` and `dhcpdump`

## Issues Found

1. **`awk '{print $9}'` for MAC extraction from journalctl** — Fixed.
   - The `journalctl -u isc-dhcp-server` default output format is `Mon DD HH:MM:SS hostname unit[PID]: message`. For a `DHCPDISCOVER from <MAC> via <iface>` message, the MAC is at field `$8` (since `$5` is `dhcpd[PID]:`, `$6` is `DHCPDISCOVER`, `$7` is `from`, `$8` is the MAC, `$9` is `via`). The script was extracting the literal word "via" instead of the MAC. Changed `$9` → `$8`.

2. **Python `kea-utilization.py` used the wrong result-set column** — Fixed.
   - The `stat-lease4-get` command returns rows with columns ordered: `[subnet-id, total-addresses, cumulative-assigned-addresses, assigned-addresses, declined-addresses]` in Kea 1.9+ (and all 2.x releases on current Ubuntu). The script used `entry[2]` for "assigned", but `entry[2]` is `cumulative-assigned-addresses` (a monotonically growing total), not the current assigned count. Changed `assigned = entry[2]` → `assigned = entry[3]` and added a brief column-order comment so future readers don't trip on the same gotcha.

## Review Notes
- The awk pattern `/binding state active/` in the active-lease parser would also match a `next binding state active;` or `rewind binding state active;` line if those ever appeared. In practice these variants rarely occur for active leases (the next state is typically `free`), so the script is correct for normal lease files but is not maximally defensive. Not changed since it would risk altering the author's intent.
- The pool-size formula `192.168.1.100 – 192.168.1.200 = 101 addresses` is correct (inclusive range).
- ISC DHCP unit name `isc-dhcp-server`, default lease path `/var/lib/dhcp/dhcpd.leases`, Kea Control Agent default port `8000`, and the `lease4-get-all` / `stat-lease4-get` / `statistic-get-all` commands are all accurate.
- ISC DHCP (`isc-dhcp-server`) was declared end-of-life by ISC and is being phased out in favor of Kea. The post pragmatically covers both, which is appropriate for Ubuntu LTS users still running the legacy package, but readers planning new deployments should prefer Kea.
- The lease-file `awk` script's `/ends /` block relies on the side effect of `sub(/;$/, "")` re-splitting `$0` to strip the trailing semicolon from `$4`. This works but is subtle; not changed.
