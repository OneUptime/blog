# Validation Summary: How to Troubleshoot SIP over IPv6 Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- SIP (Session Initiation Protocol) over IPv6
- SDP (Session Description Protocol)
- Asterisk (PJSIP module)
- Kamailio (SIP proxy)
- tcpdump, tshark (packet capture/analysis)
- sipsak (SIP test tool)
- netcat (nc)
- openssl s_client (SIPS/TLS testing)
- dig (DNS, AAAA/SRV records)
- ss (socket statistics)
- RTP

## Sources Consulted
- RFC 3261 — SIP: Session Initiation Protocol (bracket notation for IPv6 in Via/Contact/URI hosts)
- RFC 4566 — SDP: Session Description Protocol (c= connection line format; IPv6 addresses in SDP are not bracketed)
- RFC 5118 — SIP Torture Test Messages for IPv6
- RFC 3263 — Locating SIP Servers (NAPTR/SRV lookup procedures)
- Asterisk PJSIP wiki / documentation — transport options (`external_signaling_address`, `external_media_address`)
- Kamailio nathelper module documentation — `fix_nated_contact()` and `af` pseudo-variable
- Wireshark display filter reference — `sip.Request-Line`, `sip.Status-Line`, `sdp.connection_info`, `sdp.media`
- tcpdump(1), tshark(1), sipsak(1), openssl-s_client(1), dig(1), ss(8) man pages

## Issues Found
No technical issues found.

## Review Notes
- The Via/Contact bracket-notation examples (WRONG vs CORRECT) correctly follow RFC 3261 §25.1 grammar where IPv6 host literals must be enclosed in `[...]` so the port colon is unambiguous.
- The SDP example showing `c=IN IP6 2001:db8::caller` (no brackets) is correct per RFC 4566 — SDP connection addresses are not bracketed, which is the reverse of SIP header convention. The concluding paragraph calls this out correctly.
- The `2001:db8::sip-server` / `2001:db8::client` / `2001:db8::caller` placeholders contain non-hex characters and are not valid IPv6 literals as written; they are clearly intended as self-documenting placeholders for the reader to substitute, consistent with the `2001:db8::/32` documentation prefix defined in RFC 3849. Acceptable for a tutorial.
- `ping6` is still widely shipped on Linux distros but has been superseded by `ping -6` / unified `ping` in iputils. Works on current systems; minor style nit, not a correctness issue.
- UDP probing with `nc -u` is unreliable for confirming that an RTP port is actually open (UDP is connectionless, so a silent "success" does not prove reachability). Fine as a quick sanity check; readers investigating hard cases should use RTP-aware tooling (e.g. `sipp`, `rtpengine` logs, or active RTP endpoint tests).
- `openssl s_client -connect [2001:db8::x]:5061` with bracketed IPv6 literal works in OpenSSL 1.1.0+; all currently supported distributions ship a compatible version.
- `asterisk -rx "pjsip show registrations"` is valid for Asterisk 13+ where PJSIP replaced chan_sip; for older chan_sip deployments the equivalent would be `sip show registry`. The post correctly targets the modern PJSIP stack.
