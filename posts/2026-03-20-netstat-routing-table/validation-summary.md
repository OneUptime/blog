# Validation Summary: How to Display Routing Table Information with Netstat

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- netstat (net-tools package)
- Linux kernel IPv4 routing table
- route command (net-tools)
- ip route (iproute2)
- Bash scripting

## Sources Consulted
- netstat(8) man page (net-tools)
- route(8) man page (net-tools)
- `netstat --help` output
- iproute2 / `ip route` documentation

## Issues Found

1. **"same as route -n" comment was inaccurate** (line 14): The post claimed `netstat -r` produces the same output as `route -n`, but per the netstat(8) man page: "netstat -r and route -e produce the same output." The two commands show different columns — `route -n` displays Metric/Ref/Use, while `netstat -r` displays MSS/Window/irtt. Changed the comment to "same output format as route -e" for accuracy.

2. **"Check for metric" section used a command that does not show metric** (lines 73-76): The original code under the comment "Check for metric (lower = preferred)" called `netstat -rn`, which does not include a Metric column in its default output. The Metric column is shown by `route -n` or `ip route`, not by `netstat -rn`. Reworded the section to instead check for multiple default routes (which is what the surrounding context actually does), and added a note pointing readers to `route -n` or `ip route` if they want to compare metric values.

## Review Notes

- The output format example for `netstat -rn` (Destination, Gateway, Genmask, Flags, MSS, Window, irtt, Iface) is accurate for net-tools netstat.
- The flag descriptions (U, G, H, !) are correct per route(8).
- `0.0.0.0` as the default route destination, `0.0.0.0` as gateway for directly-connected networks, and `0.0.0.0` genmask for default route are all correct.
- The bundled flag form `netstat -rn4` works correctly with net-tools' getopt parsing (where `-4` is a short option in the option string).
- The script's `grep "^${DEST}"` works in practice but technically the dots in IP addresses are unescaped regex metacharacters; this would only matter in pathological cases and is not worth fixing.
- The man page itself notes that netstat is "mostly obsolete" and that `ip route` is the recommended replacement — the post already acknowledges this in its "Comparing with Modern ip Route" section, which is good.
- The `ip route show` example output format (`default via ... dev ... proto dhcp metric 100` and `192.168.1.0/24 dev eth0 proto kernel scope link src ...`) matches actual iproute2 output.
