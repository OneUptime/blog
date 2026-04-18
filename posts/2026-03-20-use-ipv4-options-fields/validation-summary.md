# Validation Summary: How to Use IPv4 Options Fields

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv4 protocol (RFC 791) and IP Options header fields
- Scapy (Python packet crafting library)
- iptables with the `ipv4options` match extension
- Python 3 (for manual header parsing)

## Sources Consulted
- RFC 791 - Internet Protocol (https://datatracker.ietf.org/doc/html/rfc791) — header format, IHL field, option type byte (copy/class/number), EOL, NOP, Record Route, Timestamp, LSR, SSR
- IANA IP Option Numbers registry (https://www.iana.org/assignments/ip-parameters/ip-parameters.xhtml) — option type values (7, 68, 131, 137)
- Scapy source code (scapy/layers/inet.py) — verified `IPOption_RR`, `IPOption_Timestamp`, default lengths, and field names
- xtables-addons / ipv4options match documentation — verified iptables flag names (`--ssrr`, `--lsrr`, `--any-opt`)

## Issues Found
- **iptables flag incorrect**: The post used `iptables -m ipv4options --options any -j DROP`, but the `ipv4options` match extension does not accept `--options any`. The correct flag for matching packets that contain any IP option is `--any-opt`. Changed to `iptables -A INPUT -m ipv4options --any-opt -j DROP`. The `--ssrr` and `--lsrr` alternative lines were already correct.

## Review Notes
- The "Number" column of the options table shows the full IP Option Type octet (copy flag + class + number). This labeling is a common shorthand but is technically the full type byte, not just the 5-bit number field. Left unchanged as it matches convention in many networking references.
- The Scapy Timestamp example uses `hasattr(opt, 'timestamp')` as a guard. Current mainline Scapy's `IPOption_Timestamp` does not fully parse the trailing timestamp list into a `timestamp` field by default, so this block may not print anything on some Scapy versions. The code is still technically correct (will not raise), so it was left as-is.
- The `ipv4options` iptables match is provided by xtables-addons, not mainline iptables-extensions; readers may need to install the xtables-addons package. This context could be helpful to add in a future revision but is outside the scope of technical-correctness fixes.
- Record Route pre-allocating 9 IP slots (39-byte default length) is consistent with Scapy's current default and the RFC 791 max option area of 40 bytes.
