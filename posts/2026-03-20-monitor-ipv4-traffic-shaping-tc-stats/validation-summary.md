# Validation Summary: How to Monitor IPv4 Traffic Shaping Statistics with tc -s qdisc show

## Status
validated

## Post Type
Tutorial / Guide (operations how-to for Linux traffic control monitoring)

## Technologies Covered
- Linux Traffic Control (`tc`) from iproute2
- Token Bucket Filter (TBF) qdisc
- Hierarchical Token Bucket (HTB) qdisc and classes
- u32 classifier / filter
- Bash scripting (`while`, `watch`)

## Sources Consulted
- `tc(8)` man page (iproute2) — units (`kbit` vs `kb`/`k`), command syntax
- `tc-tbf(8)` man page — `burst` is the bucket size in bytes; `latency`/`limit` are mutually exclusive
- `tc-htb(8)` and Linux kernel `net/sched/sch_htb.c` — `lended`/`borrowed`/`giants`/`tokens`/`ctokens` xstats
- iproute2 `tc/q_htb.c` — output format `lended: %u borrowed: %u giants: %u` and `tokens: %d ctokens: %d`
- LARTC HOWTO (https://lartc.org/) — qdisc/class/filter statistics interpretation
- u32 classifier documentation — offset 20 with mask `0000ffff` matches destination port in standard 20-byte IPv4 header (0x16 = 22 = SSH)

## Issues Found
- **Inconsistent burst unit in reset example.** The example output shows `burst 32Kb` (32 kilobytes = 32768 bytes), but the reset command used `burst 32kbit`. Per `tc(8)`, `kbit` is kilobits as a size unit, so `32kbit` would be parsed as 4096 bytes (4 KiB), not 32 KiB — the resulting qdisc would not match the displayed output above. Changed `burst 32kbit` to `burst 32kb` in the reset command so the recreated qdisc actually matches the example output.

## Review Notes
- The u32 filter example (`match 00000016/0000ffff at 20 (matches dport 22)`) is correct: at offset 20 of a standard 20-byte IPv4 header, the 32-bit word holds `[src_port:dst_port]`; masking with `0000ffff` keeps the lower 16 bits, which is the destination port. `0x16 = 22` (SSH). This only works for IPv4 packets without IP options (as the post is IPv4-specific, this is appropriate).
- The HTB stat field names `lended`, `borrowed`, `giants`, `tokens`, `ctokens` match the iproute2 print format exactly (note: `lended` is the literal field name iproute2 emits, even though "lent" would be the standard English past tense).
- The TBF example output `qdisc tbf 8001: root refcnt 2 ...` uses an auto-assigned major handle (kernel auto-assigns from the 0x8000 range) and is realistic.
- The continuous monitoring script uses `${1:-eth0}` correctly for a default argument and unquoted `$INTERFACE`; quoting would be slightly safer but interface names cannot contain whitespace in practice, so this is not a defect.
- `requeues` is more precisely "the number of times the scheduler had to requeue a dequeued packet because the device was busy" — the post's "re-queued after processing" is a fair plain-English summary.

