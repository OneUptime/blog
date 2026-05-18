# Validation Summary: How to Set Up Traffic Shaping with HTB on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Linux Traffic Control (`tc`, iproute2)
- HTB (Hierarchical Token Bucket) qdisc
- `fq_codel` leaf qdisc
- `u32` packet classifier
- IFB (Intermediate Functional Block) for ingress shaping
- `mirred` action (egress redirect)
- `iperf3` for bandwidth testing
- Ubuntu / Bash scripting

## Sources Consulted
- `tc-htb(8)` man page (iproute2) — qdisc/class parameter semantics, default behavior of `ceil`
- `tc-u32(8)` man page — `sport` / `dport` / `protocol` match keywords
- LARTC HOWTO (https://lartc.org/howto/) — HTB hierarchy and borrowing model
- iproute2 source / `tc qdisc help htb` for option spellings (`default`, `r2q`)
- `iperf3` man page — confirmed `-s -p PORT`, `-R` reverse, and `-B` bind-source semantics
- Linux kernel IFB documentation — confirmed `modprobe ifb numifbs=...` and `mirred egress redirect` pattern for ingress policing

## Issues Found
1. **Filters used `dport` for locally hosted services on egress shaping.** The scenario shapes egress on a server that *hosts* HTTP, HTTPS, SSH, PostgreSQL, Redis, gRPC, and a Prometheus node exporter. For egress traffic from such a server, the response packets carry the service port in the **source** port field, not the destination port. The original `match ip dport 80 0xffff` etc. would only match outbound connections this server *initiates* to those remote ports — not the server's responses to clients. Changed all locally hosted-service filters from `dport` to `sport` and added a short comment in the filter script explaining why. The backup-server filter (`match ip dst 10.0.0.50/32`) was already correct (server sends *to* that IP) and was left unchanged, with a brief clarifying comment.

2. **iperf3 testing section would not work as written.** `iperf3 -s` listens only on the default port 5201, so the subsequent `iperf3 -c remote-server -p 80` would fail to connect. Additionally, the default direction of iperf3 has the *client* upload to the server, which exercises the server's ingress — not what egress HTB shapes. Updated the section to start an iperf3 server on each test port (`-s -p 80`, `-s -p 22`, `-s -p 5201`) and to use `-R` (reverse) on the client so the server transmits, exercising egress classification.

3. **Monitoring script awk had a useless and buggy parser.** `split($2, bytes, "")` does nothing and uses an empty field separator (non-portable across awk implementations), and `$6` from the `Sent ...` line is the literal `"(dropped"` string rather than the drop count. Fixed the awk to drop the dead `split` and read the drop count from `$7` with the trailing comma stripped via `gsub`.

## Review Notes
- HTB `prio` field range (0–7, lower is higher priority) and the default `ceil = rate` behavior used in the root class are correct per `tc-htb(8)`.
- `default 40` on the root qdisc correctly directs unclassified traffic into class `1:40`.
- The IFB ingress redirect pattern (`tc qdisc add ... handle ffff: ingress` + `mirred egress redirect dev ifb0`) is current and correct.
- `match u32 0 0` as a "match all" filter is the conventional idiom and works as described.
- The `burst` values are on the small side for 1 Gbit/s rates (kernel may emit a warning and silently raise them), but they are not incorrect — left as-is since the post is illustrative and the kernel handles sizing.
- The `iperf3 -B 10.0.0.50` example in the original was technically valid (binds the *local* source IP) but relied on the reader actually having that address on their client; the rewritten testing block now uses `-R` against the backup-class flow path more explicitly via the standard 5201 port and a note about running from a 10.0.0.50 client.
- The author may want to mention persisting `tc` configuration across reboots (e.g., via a systemd unit or `/etc/network/if-up.d/` hook) in a follow-up post — out of scope for the current edits.
