# Validation Summary: How to Use ICMPv6 Echo Request and Reply (ping6)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- ICMPv6
- IPv6
- Linux `iputils` `ping` / `ping6`
- Python `socket` raw sockets

## Sources Consulted
- RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc4443
- RFC 3542: Advanced Sockets Application Program Interface (API) for IPv6 — https://www.rfc-editor.org/rfc/rfc3542
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls — https://www.rfc-editor.org/rfc/rfc4890
- Python `socket` module documentation — https://docs.python.org/3/library/socket.html
- Local Linux `iputils` documentation checked via `ping -h`, `ping6 -h`, and `man ping` (`iputils` 20240117)

## Issues Found
- The introduction said ICMPv6 Echo was "mandatory for full compliance but optional for basic connectivity." I corrected this to match RFC 4443: every IPv6 node MUST implement an Echo responder, while an application-layer interface for originating Echo Requests and receiving Echo Replies is a SHOULD.
- The `ping6 -t 10` example claimed to set the IPv6 Hop Limit. That does not match the current Linux `iputils` documentation used by the rest of the post, so I removed that example.
- The path-MTU examples described `-M do` in overly broad "DF-equivalent" / "no fragmentation" terms. I adjusted the wording to match current `ping(8)` behavior more precisely: PMTU checks where oversized packets are rejected.
- The link-local guidance said the interface must always be specified. Current Linux `ping(8)` says link specification is still useful and avoids ambiguity, but is not documented as an unconditional requirement in all cases, so I softened that wording.
- The Python raw-socket example treated the first received packet as a valid Echo Reply. I updated it to resolve the IPv6 destination with `getaddrinfo()`, send to the correct `AF_INET6` socket address, and validate ICMPv6 type, code, identifier, and sequence number before recording a reply.
- The sample output loop used `if r["rtt_ms"]`, which would incorrectly treat a valid RTT of `0.0` as false. I changed it to `if r["rtt_ms"] is not None`.
- The privilege note only mentioned root. I updated it to mention `CAP_NET_RAW` as well, which better reflects current Linux raw-socket requirements.

## Review Notes
- The command examples are Linux `iputils`-specific. Other `ping6` implementations, including GNU inetutils and some BSD variants, use different options and may document different behavior.
- The Python example is syntactically valid after the fixes, but it still requires raw-socket privileges and depends on OS raw-socket behavior.
