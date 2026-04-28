# Validation Summary: How to Understand NAT Traversal for VoIP and SIP

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- SIP (Session Initiation Protocol)
- SDP (Session Description Protocol)
- RTP / VoIP media
- STUN (RFC 5389 / RFC 8489)
- TURN (RFC 5766 / RFC 8656)
- ICE (RFC 8445)
- SIP ALG (Linux netfilter `nf_nat_sip`, `nf_conntrack_sip`)
- Session Border Controllers (SBC)
- Asterisk (chan_sip)
- pynat / stuntman (`stunclient`)
- WebRTC

## Sources Consulted
- pynat package (https://github.com/aarant/pynat) — verified the public API exposes `get_ip_info()`, not `get_nat_type()`.
- Debian `stun-client` man page — verified syntax does not support `host:port` notation; `-p` flag sets source port.
- stuntman project (https://github.com/jselbie/stunserver) — verified `stunclient <host> [port]` syntax.
- Linux kernel netfilter source (`net/netfilter/nf_nat_sip.c`, `nf_conntrack_sip.c`) — confirmed module names.
- Asterisk `configs/samples/sip.conf.sample` and `channels/chan_sip.c` — confirmed `externip`, `localnet`, `nat=force_rport,comedia` are valid chan_sip options.
- RFC 5389 (STUN), RFC 5766/8656 (TURN), RFC 8445 (ICE), RFC 3261 (SIP).

## Issues Found

1. **Incorrect pynat API.** The post called `pynat.get_nat_type()`, which does not exist in the package. The actual public function is `pynat.get_ip_info()`, which returns `(nat_type, external_ip, external_port)`. Updated the example to use `get_ip_info()`.

2. **Incorrect STUN client invocation.** The post used `stun stun.l.google.com:19302`. The Debian `stun-client` package's `stun` binary does not accept `host:port` syntax — it parses the whole string as a hostname and uses the default STUN port 3478, so the command would not reach Google's STUN server (which listens on 19302). Replaced with `stunclient stun.l.google.com 19302` from the `stuntman` package, which does accept a server port as a positional argument.

## Review Notes
- The Asterisk `sip.conf` example uses `chan_sip`, which is deprecated and was removed in Asterisk 21. The example remains valid for Asterisk ≤ 20; readers on Asterisk 21+ should use `chan_pjsip` (different config syntax). Not changed since the post does not claim version-specific currency and the snippet is a correct chan_sip configuration.
- The annotation `← private IP for media` on the SDP `m=audio 10000 RTP/AVP 0` line is slightly imprecise — the IP itself sits on the following `c=IN IP4 ...` line; `m=` only declares port and codec. Left unchanged as the comment broadly applies to the SDP media block.
- "TURN is always reliable" is a slight overstatement (TURN reliability still depends on TURN server reachability, allocation lifetime, and bandwidth) but is acceptable shorthand for an intro-level post.
