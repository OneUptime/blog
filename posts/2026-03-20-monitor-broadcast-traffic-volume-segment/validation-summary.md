# Validation Summary: How to Monitor Broadcast Traffic Volume on a Network Segment

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux network statistics (`ip -s link show`, `/sys/class/net/*/statistics`)
- tcpdump with pcap-filter syntax (broadcast, arp, udp port filters)
- vnstat for traffic graphing
- awk / shell scripting for rate calculation
- ARP, DHCP (UDP 67/68), NetBIOS (UDP 137) broadcast protocols

## Sources Consulted
- `man ip-link` (iproute2) — output format of `ip -s link show`
- Live `ip -s link show` output to verify column ordering on current Linux kernels
- `man pcap-filter` — verified `broadcast` / `ether broadcast`, `arp`, `udp port` primitives
- `man tcpdump` — verified `-i`, `-n`, `-q`, `-c` flags and broadcast handling
- vnstat manual / project docs (https://humdi.net/vnstat/) — verified `--live` and `-h` options

## Issues Found

1. **Incorrect claim about `bcast:` counter in `ip -s link show` output.**
   - The post claimed: "The output includes `bcast:` counters showing total broadcast packets received and transmitted."
   - In reality, `ip -s link show` exposes a `mcast` column, not `bcast`. The Linux kernel does not track broadcast packets as a distinct interface counter; most NIC drivers fold broadcast frames into the multicast counter because the broadcast MAC (`ff:ff:ff:ff:ff:ff`) is a special-case multicast address at L2.
   - Fixed the explanatory text to describe the `mcast` column accurately, including the caveat about driver-dependent broadcast inclusion.

2. **Wrong awk field index in the rate-calculation script.**
   - The script used `awk '/RX:/{getline; print $4}'` and labeled the result as broadcast/multicast. On the data row under `RX:` (`bytes packets errors dropped missed mcast`), `$4` is the `dropped` counter, not `mcast`. The mcast value is `$6`.
   - Also removed two unused/dead lines: the `STAT_FILE` variable and the `START=$(cat .../rx_frame_errors ...)` assignment, which was never read.
   - Updated the field index to `$6` and added a clarifying comment.

## Review Notes
- The post's tags and description mention `iftop` and `nload`, but neither tool is actually used in the body. This is a minor metadata inconsistency rather than a technical error, so it was left unchanged per the "fix only technical errors" instruction.
- The `ip -s link show` output column ordering can vary slightly across very old iproute2 versions (e.g., `overrun` vs `missed` in column 5), but `mcast` has consistently been the 6th field for many years; the script is correct on current distributions.
- The pps thresholds in "Setting a Baseline and Alerting" are reasonable rough guidance and are presented as such; they are not absolute and depend on segment size and protocols in use.
- `ip -s -s link show` (double `-s`) yields additional detail rows (errors broken down by type) but does not add a separate broadcast counter, so no further change is warranted.
