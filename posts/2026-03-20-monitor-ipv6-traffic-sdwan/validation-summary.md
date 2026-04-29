# Validation Summary: How to Monitor IPv6 Traffic in SD-WAN

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- IPv6
- SD-WAN (Cisco vManage, FortiGate, Silver Peak Orchestrator)
- IPFIX (RFC 7011) and NetFlow v9
- ntop nProbe
- Python (`socket`, `struct`, `ipaddress`, `prometheus_client`)
- Prometheus / node_exporter
- Linux iputils (`ping`/`ping6`, `ip -6 link`)

## Sources Consulted
- IANA IPFIX Information Elements registry — https://www.iana.org/assignments/ipfix/ipfix.xhtml
- RFC 7011 (Specification of the IP Flow Information Export Protocol) — https://datatracker.ietf.org/doc/html/rfc7011
- RFC 5102 / RFC 7012 (IPFIX Information Model)
- ntop nProbe CLI options — https://www.ntop.org/guides/nprobe/cli_options.html
- Fortinet FortiOS SD-WAN diagnose commands — https://docs.fortinet.com/document/fortigate/7.4.0/administration-guide/818746/sd-wan-related-diagnose-commands
- Debian iputils ping(8)/ping6(8) manpages
- Python `prometheus_client` library docs — https://prometheus.github.io/client_python/

## Issues Found
1. **Incorrect IPFIX element name for ID 195.** The constant `IPFIX_DSCP = 195` was annotated `# ipClassOfService`, but per the IANA IPFIX registry, element 195 is `ipDiffServCodePoint`; element ID 5 is `ipClassOfService`. Updated the comment to `ipDiffServCodePoint`.
2. **Off-by-eight length check before unpacking 20 bytes.** The Python flow processor checked `if off + 12 <= len(data):` before calling `struct.unpack('!QQHH', data[off:off+20])`. `!QQHH` is 8+8+2+2 = 20 bytes, so the guard would let the slice go past `len(data)` and cause an unpack failure. Changed the guard to `if off + 20 <= len(data):`.
3. **Invalid nProbe long-form options.** The original config used `--interface=eth0`, `--export-interval=60`, `--export-direction=both`, `--ipv6-only=0`, `--template-id=256`, `--netflow-version=10`, and `--dump-format=binary`. None of these are documented nProbe flags. Replaced with the documented short-form flags (`-i eth0`, `-V 10`, `-U 257`, kept `--collector-port=2055` and `-n 127.0.0.1:9995` which are real). Removed flags with no real equivalent rather than inventing them.
4. **Canonical IPFIX element-name capitalization.** Changed the comments `nextHopIPv6Address (62)` and `bgpNexthopIPv6Address (63)` to `ipNextHopIPv6Address (62)` and `bgpNextHopIPv6Address (63)` to match the IANA registry naming.
5. **Deprecated `ping6` invocation with sub-200ms interval.** `ping6` has been merged into `ping -6` in modern iputils, and intervals below 0.2s require root. Changed `['ping6', '-c', '10', '-i', '0.1', dest_ipv6]` to `['ping', '-6', '-c', '10', '-i', '0.2', dest_ipv6]`.
6. **Invalid FortiGate CLI commands.** `diagnose sys sdwan health-check status` (no `status` subcommand) and `get system sdwan-monitor` (no such config tree) are not in the FortiOS reference. Replaced with `diagnose sys sdwan health-check` and `diagnose sys sdwan member`, which are documented.

## Review Notes
- The IPFIX message header parsing (`struct.unpack('!HHIII', data[:16])`) and set-ID handling (set ID ≥256 = data set, 2 = template, 3 = options template) match RFC 7011 §3.1/§3.3.2.
- The Python flow processor's data-set parsing is intentionally simplified (it assumes a fixed template with `srcIPv6 + dstIPv6 + bytes(Q) + packets(Q) + srcPort(H) + dstPort(H)`); a production implementation must store the actual template definitions received from each exporter and decode records accordingly. The author flags this with the "Simplified: assume known template" comment, which is fair for an illustrative example.
- `subprocess.run(['ip', '-6', '-s', 'link'], ...)` returns the same raw counters as `ip -s link`; per-interface byte/packet counters are not IPv6-specific. For true per-IPv6 counters, `/proc/net/dev_snmp6/<iface>` exposes IPv6-only SNMP counters (`Ip6InOctets`, `Ip6OutOctets`, etc.). This is a refinement opportunity, not an error.
- The vManage and Silver Peak vendor pointers are GUI-path hints (not CLI commands) and are reasonable as navigation references; exact menu names drift between releases.
