# Validation Summary: How to Monitor Fragmentation Statistics on Linux

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Linux kernel IPv4 fragmentation/reassembly counters (SNMP MIB)
- `/proc/net/snmp` interface
- `nstat` (iproute2)
- `awk`, shell scripting (bash)
- Python 3 (parsing `/proc/net/snmp`)
- Prometheus text exposition format

## Sources Consulted
- iproute2 `nstat(8)` help output (`nstat --help`) — confirms `-a` (ignore history), `-z` (show zeros), `-d SECS` (scan/sample, requires SECS argument)
- Linux kernel source `net/ipv4/proc.c` (`snmp4_ipstats_list`) — column ordering and counter names exposed in `/proc/net/snmp`
- Linux kernel source `net/ipv4/ip_fragment.c` (`ip_expire()`) — confirms `IPSTATS_MIB_REASMTIMEOUT` and `IPSTATS_MIB_REASMFAILS` are incremented on reassembly timeout (so in Linux, `ReasmTimeout` is a counter of timed-out reassemblies, a deviation from strict RFC 1213 / RFC 4293 semantics where it would be a static timeout value)
- Live verification on a Linux host: `cat /proc/net/snmp | head -2`, `nstat -az | grep -iE "frag|reasm"`, and reproduction of the original (broken) awk pipeline
- Prometheus text exposition format — `# HELP`/`# TYPE` lines and counter type semantics (monotonically increasing)

## Issues Found

1. **Broken awk/grep pipeline in the "Key Fragmentation Counters" section.**
   The original command was:
   ```
   cat /proc/net/snmp | awk '/^Ip:/{getline; print $0}' | tr ' ' '\n' | \
     grep -A1 'ReasmFails\|ReasmOKs\|...' || nstat -a | grep -i "frag\|reasmb"
   ```
   Two problems: (a) the awk pipeline prints the *values* line (after `getline`), then `tr` splits values onto separate lines, then `grep` searches for *counter names* among numeric values — it can never match (verified empirically — the first half always falls through to the `||` fallback). (b) The fallback grep contained a typo: `reasmb` instead of `reasm`, so reassembly counters would be missed.
   Replaced with a working `nstat -az | grep -iE "frag|reasm"` plus a correct awk one-liner that pairs the header keys with the value line.

2. **`nstat -d` used without an argument (twice in "Real-Time Monitoring").**
   `nstat`'s `-d`/`--scan=SECS` option requires a numeric SECS argument; running `nstat -d` (no arg) errors out with `option requires an argument -- 'd'` (verified). The intent in the post was clearly "show deltas", which is the *default* behavior of `nstat` (it stores a per-user history file and prints the difference on each invocation). Replaced both `nstat -d` invocations with plain `nstat`, and updated the surrounding comment to describe the actual default behavior.

3. **Alert script and Prometheus exporter used `nstat -z` where absolute counters are needed.**
   Without `-a`, `nstat` returns deltas since the last call. The alert script compares `FAIL > PREV_FAIL` to detect monotonic growth, which only makes sense with absolute values, and Prometheus `counter` metrics must be absolute and monotonically increasing — exporting deltas would corrupt rate calculations. Changed `nstat -z` to `nstat -az` in both the alert loop and all four exporter snippets.

## Review Notes

- The post's claim that `IpReasmTimeout` is a counter of fragments that expired before complete arrival is technically a Linux-specific behavior (the kernel increments `IPSTATS_MIB_REASMTIMEOUT` in `ip_expire()`). Strict RFC 1213 / RFC 4293 semantics define `ipReasmTimeout` as the *configured* timeout in seconds. The post is correct for Linux, which is the documented target platform — no change made.
- Counter `IpFragOKs` is exposed by Linux but is not incremented by current kernel code paths (it's a legacy MIB-II column that typically reads 0); the post lists it but does not lean on it in any actionable advice, so this is not misleading.
- The `watch -n 2 "nstat -z | grep ..."` example will display per-2-second deltas (because `nstat` defaults to delta mode and watch re-invokes it). This is useful for spotting new fragmentation activity but may surprise a reader expecting absolute totals. Left as-is — not technically incorrect, and per-interval deltas are arguably more useful for "real-time" observation.
- The single-line `awk` parser added to replace the broken pipeline is functionally equivalent to the Python parser shown later in the post; this redundancy is acceptable given the post structure (intro/quick-look vs. deeper parsing example).
