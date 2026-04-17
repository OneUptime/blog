# Validation Summary: How to Analyze SIP and VoIP Traffic Over IPv4 in Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (display filters, Telephony menu, RTP Streams, VoIP Calls)
- tshark (CLI field extraction)
- tcpdump (BPF capture filters)
- SIP (Session Initiation Protocol, RFC 3261)
- SDP (Session Description Protocol, RFC 8866)
- RTP (Real-time Transport Protocol, RFC 3550)
- NAT traversal (STUN/ICE/ALG) for VoIP

## Sources Consulted
- Wireshark SIP display filter reference: https://www.wireshark.org/docs/dfref/s/sip.html
- Wireshark RTP display filter reference: https://www.wireshark.org/docs/dfref/r/rtp.html
- Wireshark SDP display filter reference: https://www.wireshark.org/docs/dfref/s/sdp.html
- Wireshark User's Guide, Telephony menu: https://www.wireshark.org/docs/wsug_html_chunked/ChTelMenu.html
- Wireshark source `ui/voip_calls.c` (VoIP call state enumeration)
- RFC 3261 (SIP) — methods and status codes
- RFC 3550 (RTP) — header fields
- RFC 8866 (SDP) — `c=` connection line and `m=` media line syntax
- tcpdump/pcap-filter(7) BPF syntax

## Issues Found
1. **Incorrect VoIP Calls "State" values.** The post listed `CALL, RTP, BYE` as example states. Per Wireshark's source (`ui/voip_calls.c`), the actual state enumeration is `CALL SETUP`, `RINGING`, `IN CALL`, `CANCELLED`, `COMPLETED`, `REJECTED`. Updated the list accordingly.
2. **"Telephony → SIP Flows" menu item does not exist.** Wireshark does not have a standalone "SIP Flows" entry. SIP ladder diagrams are reached via `Telephony → VoIP Calls` then the `Flow Sequence` button. Replaced the reference (in the step and the ladder-diagram caption) and pointed users to `Telephony → SIP Statistics` for method/response counts. Also updated the Conclusion to match.
3. **Incorrect SDP display filter.** `sdp.media_attr contains "IP4"` will not match connection-line IP info — `sdp.media_attr` only covers `a=` attribute lines. The `c=IN IP4 ...` line is exposed via `sdp.connection_info.*` fields. Replaced with `sdp.connection_info.address_type == "IP4"`.

## Review Notes
- SIP methods (`INVITE`, `BYE`, `REGISTER`, `ACK`) and status codes (100, 180, 200, 403, 404, 408, 486, 503) are RFC 3261 compliant. The mapping of 403 Forbidden to "Authentication failed" is a common practical simplification — strictly, 401 Unauthorized / 407 Proxy Authentication Required are the auth-challenge codes, but 403 is often emitted by SIP providers for credential/account-disabled cases, so the description is acceptable.
- RTP quality thresholds (jitter/loss) are reasonable industry rules-of-thumb; actual MOS/perceptual impact depends on codec (e.g., G.711 vs Opus) and jitter-buffer behaviour.
- The 10000-20000 RTP port range is an Asterisk/FreePBX default; other stacks (Cisco, Kamailio, Avaya) use different ranges. The post phrases it as "typically," which is accurate.
- tshark field names (`rtp.ssrc`, `rtp.seq`, `rtp.timestamp`, `frame.time_delta`) and SIP filter fields (`sip.Method`, `sip.Status-Code`) all verified against the current Wireshark display-filter reference.
- BPF expressions (`port 5060 or udp portrange 10000-20000`, `udp portrange 10000-20000`) are syntactically valid per pcap-filter(7).
