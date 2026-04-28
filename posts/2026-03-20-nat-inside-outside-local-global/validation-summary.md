# Validation Summary: How to Understand Inside Local, Inside Global, Outside Local, Outside Global

## Status
validated

## Post Type
Conceptual reference / Tutorial — explains Cisco's four NAT address terms with examples and a small Python simulation.

## Technologies Covered
- Cisco IOS NAT terminology (Inside Local, Inside Global, Outside Local, Outside Global)
- IPv4 addressing (RFC 1918 private space, public/global addresses)
- Source NAT (PAT) and Destination NAT (DNAT / port forwarding)
- Cisco IOS `show ip nat translations` command
- Python 3 f-string formatting (string padding format specs)

## Sources Consulted
- Cisco "NAT: Local and Global Definitions" documentation — defines inside local, inside global, outside local, outside global addresses (https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/4606-8.html)
- Cisco "Configuring Network Address Translation: Getting Started" (https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/13772-12.html)
- Cisco IOS IP Addressing Services Command Reference — `show ip nat translations` output format
- RFC 2663 (IP Network Address Translator Terminology and Considerations)
- RFC 1918 (Address Allocation for Private Internets)
- Python 3 documentation — Format Specification Mini-Language (string width padding via `:N`)

## Issues Found
No technical issues found.

- The four-term table accurately reflects Cisco's definitions: Inside Local = inside host as seen from inside, Inside Global = inside host as seen from outside, Outside Local = outside host as seen from inside, Outside Global = outside host as seen from outside.
- The walking example (192.168.1.10 → 203.0.113.1 → 8.8.8.8) correctly maps to all four terms with Outside Local = Outside Global because no destination translation is applied.
- The `show ip nat translations` sample output uses the correct Cisco IOS column order: Pro, Inside global, Inside local, Outside local, Outside global.
- The DNAT / port-forwarding scenario correctly identifies the inside server's private IP as Inside Local and the public-facing translated IP as Inside Global, with the external client occupying the Outside Local/Global slots.
- The "Outside Local ≠ Outside Global" example (inside hosts reach 10.0.0.1 which is translated to 8.8.8.8) is the classic Cisco outside source NAT / address overlap scenario and is described accurately.
- The Python `NATEntry` class was executed and produces aligned output as intended; the `:5` and `:22` f-string format specs are valid Python 3 string-width padding syntax.

## Review Notes
- The `show ip nat translations` example uses the same port (1024) for both Inside Local and Inside Global. This is plausible for static NAT or when PAT happens to assign the same source port, but in typical PAT output the inside global port often differs from the inside local port. The Python example below it correctly shows differing ports (54321 → 1024), so the post as a whole is internally consistent and not misleading.
- The post is Cisco-flavored terminology; Linux iptables / pf / nftables use different vocabulary (SNAT/DNAT/MASQUERADE) — out of scope here, but readers coming from those backgrounds should know the four-term framework is largely a Cisco convention also formalized in RFC 2663.
- Minor non-technical wording: "All shares one public IP" in the Quick Reference table reads slightly awkwardly ("All share..."), but this is a grammar nit, not a technical inaccuracy, so left untouched per review scope.
