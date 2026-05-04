# Validation Summary: How to Configure Receive Side Scaling (RSS) on Linux Network Adapters

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Receive Side Scaling (RSS)
- Linux networking stack
- ethtool (channels, rx-flow-hash, statistics)
- /proc/interrupts and /proc/irq/*/smp_affinity
- irqbalance
- udev rules
- systemd unit files
- mpstat (sysstat)

## Sources Consulted
- ethtool(8) man page (verified `-l`/`-L`, `-n`/`-N rx-flow-hash`, `-S` flags and `m|v|t|s|d|f|n|r` hash flag definitions)
- Linux kernel documentation: Documentation/networking/scaling.rst (RSS, RPS, RFS overview)
- Microsoft Windows Driver "Introduction to Receive Side Scaling" (RSS hash function definition; uses 4-tuple for TCP/UDP)
- Linux kernel Documentation/IRQ-affinity.txt (smp_affinity hex bitmask format)
- mpstat(1) man page (`-P ALL` and interval/count syntax)
- systemd.service(5) and systemd.unit(5) (Type=oneshot, RemainAfterExit, WantedBy)
- udev(7) rules syntax (ACTION, SUBSYSTEM, KERNEL, RUN+=)

## Issues Found
1. **Incorrect tuple description for RSS hash.** The original post described RSS as hashing "the 5-tuple (source IP, dest IP, source port, dest port, protocol)". RSS hash configuration is set per flow-type (tcp4, udp4, etc.) and the recommended `sdfn` configuration the post itself uses hashes only 4 fields (src IP, dst IP, src L4 port, dst L4 port). The IP protocol field is not part of the default hash input — it would only be included if the `t` flag were set. Changed to "4-tuple (source IP, dest IP, source port, dest port) for TCP/UDP flows".
2. **Inconsistent example output for `ethtool -l`.** The "Current hardware settings" block listed `Combined: 8` next to a comment claiming "currently only 1 queue (RSS disabled)". A `Combined: 8` value means RSS is already enabled with 8 queues, contradicting the comment and the entire premise of Step 2 (which enables RSS). Changed `Combined: 8` to `Combined: 1` so the example is internally consistent and matches the disabled-RSS narrative.

## Review Notes
- The "~2-3 Gbps single-core bottleneck on a 10G/25G NIC" figure is approximate and packet-size dependent (small packets stress softirq processing far more than large ones), but it is a reasonable order-of-magnitude estimate and not technically wrong.
- The IRQ affinity loop in Step 5 assumes IRQs assigned to `eth0-TxRx-N` are sequentially numbered starting from `eth0-TxRx-0`. This is typical on Intel/Mellanox drivers but is not guaranteed; on systems where IRQ allocation is non-sequential, the user should iterate based on `/proc/interrupts` parsing rather than `IRQ_BASE + i`. The post's approach is fine as an illustrative example.
- The simple `printf "%x" $((1 << i))` CPU mask works only for systems with up to 32 CPUs. For systems with more cores, `smp_affinity` requires comma-separated 32-bit hex chunks. Not flagged as an error since most readers will have ≤32 cores and the technique scales with `smp_affinity_list` as an alternative.
- `irqbalance` and manual affinity pinning are presented as alternatives, which is correct — they should not be combined, since irqbalance will move IRQs after manual placement. The post implicitly conveys this with "Or manually set affinity" but does not call out the conflict explicitly. Not a technical error.
- The udev rule and systemd unit are both shown as "or" alternatives for persistence. Both are syntactically valid. In practice, the systemd unit is more reliable since udev RUN+= actions have constraints (no long-running commands, fork limitations); however, ethtool -L is fast and short, so either approach works.
