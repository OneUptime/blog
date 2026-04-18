# Validation Summary: How to Understand IPv4 Fragmentation and Reassembly

## Status
validated

## Post Type
Tutorial / Guide (explains IPv4 fragmentation mechanics and Linux tooling to observe/diagnose it)

## Technologies Covered
- IPv4 protocol (fragmentation, MTU, DF/MF flags, fragment offset, identification field)
- Linux kernel networking (`/proc/net/snmp`, `nstat`, `sysctl net.ipv4.ipfrag_*`)
- `ip` command (iproute2) for interface MTU inspection
- `tcpdump` BPF filters for fragment detection
- Encapsulation overhead (VXLAN, GRE, PPPoE) and resulting effective MTU
- Python3 one-liner for MTU arithmetic
- UDP and TCP behavior under fragmentation (loss, MSS negotiation)

## Sources Consulted
- RFC 791 — Internet Protocol (IPv4 header format, fragmentation, flags, offset semantics)
- Linux kernel source `net/ipv4/proc.c` (`snmp4_ipstats_list`) — confirmed field order for `/proc/net/snmp` "Ip:" line
- Live `/proc/net/snmp` output on the current host — confirmed field positions: `$14=ReasmTimeout`, `$15=ReasmReqds`, `$20=FragCreates`
- `tcpdump` 4.99.4 man page — confirmed fragment output format `(frag id:len@offset+)` and that `+` denotes MF
- `sysctl net.ipv4.ipfrag_time` on a Linux 6.17 host — confirmed default 30s
- `Documentation/networking/ip-sysctl.rst` (Linux kernel) — `ipfrag_time`, `ipfrag_high_thresh`, `ipfrag_low_thresh` semantics
- VXLAN (RFC 7348) — 50-byte overhead (outer Ethernet/IP/UDP + 8-byte VXLAN header)
- GRE (RFC 2784) — 4-byte minimum GRE header + 20-byte outer IP = 24 bytes
- PPPoE (RFC 2516) — 8-byte total header (6 PPPoE + 2 PPP)

## Issues Found

1. **Incorrect awk field index for `FragCreates` in `/proc/net/snmp` parsing.**
   The post used `$14` labeled as "Fragments created", but `$14` is actually `ReasmTimeout`. According to the Linux kernel's `snmp4_ipstats_list` (and verified on a live system), the IP stats values line fields are: `$1=Ip:`, `$2=Forwarding`, `$3=DefaultTTL`, `$4=InReceives` ... `$14=ReasmTimeout`, `$15=ReasmReqds`, `$16=ReasmOKs`, `$17=ReasmFails`, `$18=FragOKs`, `$19=FragFails`, `$20=FragCreates`. Changed `$14` → `$20` so the printed "Fragments created" value is correct. The `$15` (labeled "Reassembly required") was already correct for `ReasmReqds`.

2. **Inaccurate `tcpdump` fragment output format.**
   The post showed output like `frag 12345:0+` and `frag 12345:1480+`, which misrepresents the tcpdump format (the number after the colon is the fragment's length, not its offset). Per the tcpdump source and man page, the compact fragment notation is `(frag ID:length@offset+)` with `+` indicating MF. Rewrote the example output to `(frag 12345:1480@0+)`, `(frag 12345:1480@1480+)`, `(frag 12345:40@2960)` so length/offset are both shown correctly and the last-fragment size (40 bytes) matches the running 3000-byte-payload example.

## Review Notes
- The fragment-offset arithmetic (185, 370) and byte-range math are correct: the protocol specifies offset in units of 8 bytes, and the example respects the "all non-last fragments must have payload length divisible by 8" rule.
- The BPF filter `(ip[6:2] & 0x3fff) != 0` correctly masks off the Reserved and DF bits while keeping MF and the 13-bit offset, so it matches every fragment (including the last) and excludes unfragmented packets. Worth noting: this filter only works on non-VLAN-tagged Ethernet; for VLAN traffic users would need `vlan and (ip[6:2] & 0x3fff) != 0`. Not incorrect as written, just a caveat for future readers.
- The GRE overhead figure (24 bytes) assumes the minimum GRE header (RFC 2784). GRE with optional fields (checksum, key, sequence) can add 4–12 more bytes. Acceptable simplification for the post's scope.
- The claim that TCP "handles MSS negotiation to avoid fragmentation automatically" is true for the common case but relies on PMTUD working end-to-end; ICMP black holes can still cause TCP PMTUD failures. Out of scope for this post.
- The `ipfrag_time` default of 30 seconds is correct on modern Linux; older kernels used the RFC 791 recommendation differently, but 30s has been the Linux default for a very long time.
- Encapsulation overheads listed (VXLAN 50, GRE 24, PPPoE 8) are all standard and match the respective RFCs.
