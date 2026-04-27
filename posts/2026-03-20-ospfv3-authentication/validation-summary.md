# Validation Summary: How to Configure OSPFv3 Authentication for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OSPFv3 (IPv6 routing protocol)
- IPsec (AH and ESP, transport mode)
- Cisco IOS (`ospfv3 authentication` / `ospfv3 encryption` commands)
- FRRouting (ospf6d) with Linux kernel xfrm
- Linux `ip xfrm` (state, policy)

## Sources Consulted
- RFC 4552 — Authentication/Confidentiality for OSPFv3 (https://datatracker.ietf.org/doc/html/rfc4552)
- RFC 7166 — Supporting Authentication Trailer for OSPFv3 (https://datatracker.ietf.org/doc/html/rfc7166)
- Cisco IOS Command Reference — `ospfv3 authentication`, `ospfv3 encryption`, `show ospfv3 interface` (cisco.com IPv6/OSPFv3 configuration guides)
- iproute2 `ip-xfrm(8)` man page
- IANA Protocol Numbers (OSPFIGP = 89)
- FRRouting documentation for ospf6d

## Issues Found

1. **Cisco ESP encryption command — incorrect argument order.**
   The post had `ospfv3 encryption ipsec spi 400 esp 3des sha1 <encryption-key> <auth-key>`. Cisco IOS syntax interleaves algorithm and key pairs: `esp <enc-algo> <enc-key> <auth-algo> <auth-key>`. Fixed to `ospfv3 encryption ipsec spi 400 esp 3des <encryption-key> sha1 <auth-key>` to match the documented Cisco command format.

2. **Verification output typo: "Authentication SPF" → "Authentication SPI".**
   The post showed expected `show ospfv3 interface` output as `Authentication SPF, algorithm SHA`. SPF (Shortest Path First) is the OSPF computation algorithm; the field shown by Cisco for IPsec-protected OSPFv3 interfaces is **SPI** (Security Parameters Index). Updated to a representative real output line: `Authentication SPI 256, secure socket UP`.

## Review Notes

- **RFC 7166 not mentioned.** The Overview states "OSPFv3 does not have built-in authentication like OSPFv2." This was true under the original RFC 5340 design, but RFC 7166 (April 2014) defined an Authentication Trailer for OSPFv3 that does provide a built-in mechanism without requiring IPsec. The post is scoped to IPsec-based authentication (which is still the dominant deployed approach and matches the post's title and stated reliance on RFC 4552), so the omission is acceptable, but readers should be aware that RFC 7166 is a supported alternative on modern platforms (including FRR ospf6d in recent versions).
- **3DES is cryptographically deprecated.** The ESP example uses `3des sha1`. The syntax is valid Cisco IOS, but for new deployments AES-CBC (e.g., `aes-cbc 256`) with `sha1` (or stronger, where supported) is preferred. Left unchanged since the example correctly demonstrates the command syntax.
- **SHA-1 minimums.** RFC 4552 originally specified HMAC-MD5 and HMAC-SHA1 for IPsec protecting OSPFv3. Stronger HMACs (SHA-256/384/512) require platform support in the IPsec stack and are commonly available on modern Linux kernels and recent IOS-XE releases.
- **FRRouting note.** FRR itself does not directly negotiate or manage IPsec SAs for OSPFv3 — the kernel xfrm subsystem handles all per-packet IPsec, and FRR is unaware of it. The post's wording ("FRRouting ... supports OSPFv3 IPsec authentication through the kernel's IPsec (xfrm) subsystem") is accurate given that framing.
- **Key/SPI matching constraints.** The post correctly notes SPI and key must match between neighbors. For OSPFv3 multicast adjacencies (AllSPFRouters ff02::5 / AllDRouters ff02::6), all routers on the same link must share the same SA — worth highlighting in a future revision but technically covered by the current text.
