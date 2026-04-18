# Validation Summary: How to Troubleshoot TCP Throughput Drops Due to Congestion

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux TCP stack (tcp_congestion_control, BBR, CUBIC)
- iperf3 (throughput testing, Retr column)
- iproute2: `ip -s link show`, `ss -tin`
- `tc` qdisc / class (fq, fq_codel, htb)
- iftop, nethogs (bandwidth monitoring)
- `/proc/net/sockstat`, `/sys/class/net/*/statistics`
- iptables mangle table, DSCP marking (EF/46)
- TCP congestion window (CWND) behavior: fast recovery vs. RTO

## Sources Consulted
- iperf3 man page / official docs (https://iperf.fr/iperf-doc.php) — confirms `-c`, `-t`, `-i` flags and `Retr` column presence.
- `ss` man page (iproute2) — confirms filter syntax `state established '(dst <ip>)'` and `-tin` flags; internal TCP info includes `cwnd:` field.
- `tc-bbr(8)` / kernel docs for BBR — `net.ipv4.tcp_congestion_control=bbr` is the documented sysctl; BBR pairs with `fq`/`fq_codel`.
- `tc-htb(8)` — confirms `htb rate 100mbit` class syntax and `default` class handling.
- iptables-extensions(8) — confirms `-j DSCP --set-dscp 46` (EF per RFC 2474/3246).
- RFC 5681 (TCP Congestion Control) — confirms fast recovery halving of CWND and RTO resetting CWND to the loss window (1 MSS).
- Linux kernel `/proc/net/sockstat` documentation — confirms TCP `mem` field.
- Verified modern `ip -s link show` output format locally (confirms the grep pattern fix).

## Issues Found
- **`watch -n 1 "ip -s link show eth0 | grep 'TX bytes'"` would produce no output on modern iproute2.** The current output uses headers like `TX:  bytes packets errors dropped carrier collsns` (colon immediately after `TX`), so the literal string `TX bytes` does not appear. Replaced with `watch -n 1 "cat /sys/class/net/eth0/statistics/tx_bytes"`, which reliably exposes the TX byte counter via sysfs on any modern Linux kernel and matches the "Calculate MB/s from the bytes counter difference" comment directly.

## Review Notes
- `ping -c 100 -i 0.1` requires CAP_NET_ADMIN / root on most distros because the interval is below 0.2s; this is standard ping behavior and the command is correct as written.
- BBR typically requires the `tcp_bbr` module to be loaded (often auto-loaded by the sysctl write on modern kernels). Readers running older kernels may need `modprobe tcp_bbr` first, but the sysctl is the canonical mechanism.
- Fix 3's HTB example sets up a single default class with `rate 100mbit` but does not assign specific flows to it — intentional minimal example; a full QoS setup would add filters, but the snippet is syntactically valid.
- Statement "CWND drops from 100 to 1: timeout occurred" is a simplification: Linux resets CWND to the loss window (typically 1 MSS) on RTO, matching the intent of the explanation.
- The DSCP value 46 = EF (Expedited Forwarding) is correct per RFC 3246.
