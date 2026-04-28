# Validation Summary: How to Understand Solicited-Node Multicast Addresses in NDP

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv6 addressing
- NDP (Neighbor Discovery Protocol)
- Solicited-node multicast addresses (RFC 4291)
- Neighbor Solicitation (RFC 4861)
- Ethernet multicast MAC mapping (RFC 2464)
- Linux `ip` (iproute2) multicast group management
- Python `socket` module (`inet_pton`/`inet_ntop`)

## Sources Consulted
- RFC 4291 §2.7.1, "Pre-Defined Multicast Addresses" (Solicited-Node Multicast Address): https://datatracker.ietf.org/doc/html/rfc4291#section-2.7.1
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861
- RFC 2464 §7, "Address Mapping -- Multicast" (33-33 prefix + low 32 bits): https://datatracker.ietf.org/doc/html/rfc2464#section-7
- Python `socket` documentation, `inet_pton` / `inet_ntop`: https://docs.python.org/3/library/socket.html
- `ip-maddress(8)` man page (iproute2)
- Empirical execution of the corrected Python snippet to confirm output matches the worked examples in the post.

## Issues Found
1. **Broken Python construction of the multicast address (technical bug).** In the `solicited_node_multicast` function, the literal byte assembly was:
   ```python
   b'\xff\x02' + b'\x00' * 9 + b'\xff' + last_3_bytes
   ```
   This produces only 15 bytes (2 + 9 + 1 + 3), causing `socket.inet_ntop` to raise `ValueError: invalid length of packed IP address string`. It also omits the `01` nibble of the `ff02:0:0:0:0:1:...` group. Fixed to:
   ```python
   b'\xff\x02' + b'\x00' * 9 + b'\x01\xff' + last_3_bytes
   ```
   which yields a correct 16-byte representation. Verified by running the script: outputs match the worked examples in the "Solicited-Node Multicast Address Format" section (`2001:db8::1` → `ff02::1:ff00:1`, `2001:db8::1234:5678` → `ff02::1:ff34:5678`, etc.).

2. **Misleading inline test-case comment.** The comment on `2001:db8::200` read `# Note: same last 24 bits as 2001:db8::200 vs ::100`, which is both self-referential and factually wrong — `::100` has low 24 bits `00:01:00` while `::200` has `00:02:00`, so they map to different solicited-node groups. Replaced with `# Different low 24 bits from ::100 -> different SNM group`, which accurately reflects what the test is illustrating.

## Review Notes
- The `ff02::1:ff00:0/104` prefix derivation, the worked examples, the 33:33 + low-32-bits Ethernet MAC mapping, and the collision-probability arithmetic (`1000/2^24 ≈ 5.96e-5 ≈ 0.006%`) are all correct.
- The claim that solicited-node multicast addresses are "used exclusively for NDP Neighbor Solicitation" is a reasonable simplification — NS for address resolution and DAD is the dominant (and effectively only) traffic seen on these groups in practice; left unchanged.
- `ip -6 maddr show` output format varies slightly across iproute2 versions (some omit `users N`), but the example shown is plausible and matches common output. Not changed.
- The fixed Python script has been executed end-to-end and produces:
  - `2001:db8::1` → `ff02::1:ff00:1`, MAC `33:33:ff:00:00:01`
  - `2001:db8::1234:5678` → `ff02::1:ff34:5678`, MAC `33:33:ff:34:56:78`
  - `fe80::dead:beef` → `ff02::1:ffad:beef`, MAC `33:33:ff:ad:be:ef`
  - `2001:db8::100` → `ff02::1:ff00:100`, MAC `33:33:ff:00:01:00`
  - `2001:db8::200` → `ff02::1:ff00:200`, MAC `33:33:ff:00:02:00`
