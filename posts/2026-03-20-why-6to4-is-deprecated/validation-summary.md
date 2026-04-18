# Validation Summary: How to Understand Why 6to4 Is Deprecated

## Status
validated

## Post Type
Technical guide / reference post covering the history, failure modes, and deprecation of the 6to4 IPv6 transition mechanism, with operational commands for detection and removal.

## Technologies Covered
- IPv6 transition mechanisms (6to4, 6rd, 6in4)
- RFC 3056 (original 6to4), RFC 3068 (6to4 anycast prefix), RFC 6732 (6to4 Provider Managed Tunnels), RFC 7526 (deprecation), RFC 6343 (advisory guidelines)
- IPv4 protocol 41 encapsulation
- Happy Eyeballs (RFC 6555 / RFC 8305)
- Linux `iproute2` / kernel `sit` module
- Windows `netsh interface 6to4`
- `nftables` and `ip6tables` firewall rules

## Sources Consulted
- RFC 7526 (raw text) — https://www.rfc-editor.org/rfc/rfc7526.txt
- RFC 3056 (6to4 original spec) — https://www.rfc-editor.org/rfc/rfc3056
- RFC 3068 (6to4 Anycast Prefix) — https://www.rfc-editor.org/rfc/rfc3068
- RFC 6343 (6to4 advisory guidelines) — https://www.rfc-editor.org/rfc/rfc6343
- RFC 6555 / RFC 8305 (Happy Eyeballs) — https://www.rfc-editor.org/rfc/rfc8305
- IANA IPv4 Special-Purpose Address Registry

## Issues Found

1. **Misattributed direct quote.** The blockquote attributed to RFC 7526 ("6to4 can cause significant stability and usability problems for users and should be considered harmful. It SHOULD NOT be used.") does not appear in RFC 7526 — the word "harmful" is not used in the RFC, and no such sentence exists. Replaced with the actual Section 4 text: "This document formally deprecates the anycast 6to4 transition mechanism defined in [RFC3068] and the associated anycast IPv4 address 192.88.99.1. It is no longer considered to be a useful service of last resort."

2. **Incorrect reassignment claim.** The post stated that the 192.88.99.0/24 prefix "may now be assigned for other uses." RFC 7526 Section 4 explicitly says: "The prefix 192.88.99.0/24 MUST NOT be reassigned for other use except by a future IETF Standards Action," and the IANA Considerations section reiterates this requirement. Corrected to reflect the actual restriction.

3. **Incorrect filtering recommendation.** The post listed "Network operators should filter `2002::/16` at borders" as a key action from RFC 7526. Section 6 of RFC 7526 explicitly states: "This document does not imply a recommendation for the generalized filtering of traffic or routes for 6to4 or even anycast 6to4." Removed this item and replaced with the RFC's actual mandate that implementations disable 6to4 (including unicast) by default, plus a note that unicast 6to4 / 2002::/16 are not formally deprecated. The operator-level filtering example later in the post is preserved as the author's operational advice, just no longer attributed to the RFC.

## Review Notes

- The hex derivations of 6to4 addresses are correct (192.0.2.10 → `c000:020a`; 10.0.0.5 → `0a00:0005`).
- Protocol 41 (IPv6-in-IPv4), 192.88.99.1 as the anycast address, and the 2002::/16 prefix are all correctly described.
- The Linux commands (`ip addr`, `ip tunnel del`, `ip link del`, blacklisting the `sit` kernel module), Windows `netsh interface 6to4` commands, and `nftables` / `ip6tables` rules are all syntactically valid.
- The post title and overview frame 6to4 as "deprecated" without the nuance that RFC 7526 strictly deprecates only the anycast extension (RFC 3068) and mandates unicast 6to4 be disabled by default. The corrected "Key actions" section now surfaces this distinction. For future posts, a more precise title would be "Why 6to4 Anycast Is Deprecated."
- The "Widely deployed from 2001 to 2012" timeframe is an approximation — Apple (OS X 10.7 era) and Microsoft (Windows 8.1) began disabling 6to4 by default in the 2012–2014 window, so this is a reasonable characterisation.
- RFC 9486 (2023) has since returned 192.88.99.0/24 to the general IPv4 pool via IETF Standards Action; the post does not mention this, which is fine for a post scoped to RFC 7526's effect.
