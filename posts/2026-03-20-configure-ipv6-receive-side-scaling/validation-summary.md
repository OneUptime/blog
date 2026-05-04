# Validation Summary: How to Configure IPv6 Receive Side Scaling (RSS) on Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Linux kernel networking stack
- Receive Side Scaling (RSS)
- Receive Packet Steering (RPS)
- Receive Flow Steering (RFS)
- ethtool (channel and flow-hash configuration)
- sysfs network queue interfaces (`/sys/class/net/<dev>/queues/rx-N/`)
- `/proc/sys/net/core/rps_sock_flow_entries`
- irqbalance
- IPv6 (TCP/UDP/raw) traffic flows

## Sources Consulted
- Linux kernel networking docs — Scaling in the Linux Networking Stack: https://www.kernel.org/doc/Documentation/networking/scaling.rst
- ethtool(8) man page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- Linux kernel admin sysctl docs (`net.core.rps_sock_flow_entries`)

## Issues Found

1. **Step 4 — Incorrect comment about `rps_flow_cnt` scope and ownership.**
   The original comment read `# Set RPS flow table size (entries per CPU)`. Two problems:
   - `rps_flow_cnt` is a **per-queue** setting (located under `/sys/class/net/<dev>/queues/rx-<n>/`), not per-CPU.
   - `rps_flow_cnt` and `rps_sock_flow_entries` are part of **RFS** (Receive Flow Steering), not RPS — the `rps_` prefix in their sysfs names is historical and misleading.

   Fixed by changing the comment to `# Set per-queue RFS flow table size (entries per receive queue)` and the global comment from `# Set global RPS flow table size` to `# Set global RFS flow table size`. Verified against kernel.org/doc/Documentation/networking/scaling.rst.

## Review Notes

- Step 4 is titled "Configure RPS (Software RSS Fallback)" but in addition to RPS configuration (`rps_cpus`) it also configures the RFS flow tables (`rps_flow_cnt`, `rps_sock_flow_entries`). This blending is common in tutorials and the corrected comments now accurately describe the RFS portion. Step 5 then re-covers RFS more explicitly. Not strictly an error, but readers should understand the two mechanisms layer.
- `ethtool -N eth0 rx-flow-hash tcp6 sd` (Step 3) only hashes on IPv6 source/dest addresses, not L4 ports, so all flows between two endpoints will land on the same RX queue. For better distribution, `sdfn` is generally preferred (as the post does for `udp6`). Acceptable as a deliberate choice for ordering-sensitive workloads.
- The `BITMASK=$(python3 -c "print(hex(2**$CPUS - 1))")` expression yields output with a `0x` prefix (e.g., `0xff`). Modern Linux kernels accept hex bitmasks with or without the `0x` prefix when written to `rps_cpus`, so this works correctly.
- The persistent-config snippet has the path comment `# /etc/network/if-up.d/rss-setup` on line 1 and `#!/bin/bash` on line 2. This is a documentation convention (the path comment is a label telling the reader where to save the file), but readers who copy the entire block verbatim will end up with the shebang on the wrong line. A reader following the convention will correctly start the file at `#!/bin/bash`. Left as-is since the convention is widespread.
- Path `/etc/network/if-up.d/` is specific to Debian/Ubuntu `ifupdown`; it does not apply to NetworkManager or systemd-networkd setups. Readers on those systems would need a different persistence mechanism (e.g., a systemd unit or NetworkManager dispatcher script).
- All other commands, paths, ethtool flags (`s|d|f|n|m|v|t|r`), flow types (`tcp6`, `udp6`, `ip6`), and sysfs paths verified accurate against current kernel and ethtool documentation.
