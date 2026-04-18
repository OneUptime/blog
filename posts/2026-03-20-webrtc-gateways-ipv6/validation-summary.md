# Validation Summary: How to Configure WebRTC Gateways with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- WebRTC (RTCPeerConnection, ICE, SRTP)
- Janus Gateway (INI-style config, HTTP transport, NAT/ICE options)
- Mediasoup v3 (Worker, Router, WebRtcTransport)
- coturn (TURN/STUN server, long-term credential mechanism)
- IPv6 networking / RFC 4291 addressing
- ip6tables / netfilter-persistent
- ICE / STUN / TURN (RFC 5245, RFC 8445, RFC 5766/8656)

## Sources Consulted
- Janus Gateway sample configs (conf/janus.jcfg.sample, janus.transport.http.jcfg.sample) — https://github.com/meetecho/janus-gateway
- mediasoup v3 API docs — https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
- coturn turnserver.conf man page and turnserver(1) — https://github.com/coturn/coturn/wiki/turnserver
- W3C WebRTC Recommendation — https://www.w3.org/TR/webrtc/ (RTCRtcpMuxPolicy, RTCIceCandidate)
- RFC 4291 (IPv6 Addressing Architecture) §2.2 — hex-digit hextets
- RFC 5245 / RFC 8445 — ICE candidate attribute syntax
- RFC 7064/7065 — STUN/TURN URI scheme (IPv6 literals bracketed)
- Debian `iptables-persistent` / `netfilter-persistent` documentation (rules.v4/rules.v6 paths)

## Issues Found
1. **Invalid IPv6 literal `2001:db8::gateway`** (Mediasoup `announcedIp`). The label `gateway` contains `g/t/w/y`, which are not valid hex digits per RFC 4291 §2.2. Replaced with `2001:db8::face` (valid hex).
2. **Invalid IPv6 literal `2001:db8::turn`** (coturn `external-ip`, `relay-ip`, and JS TURN URL). The label `turn` contains `t/u/r/n`, none of which are valid hex. Replaced all three occurrences with `2001:db8::cafe`.
3. **Wrong Janus option name `icev6=true`**. The actual directive in Janus's `[nat]` section is `ice_ipv6`. Corrected to `ice_ipv6=true`.
4. **Invalid coturn directive `no-tls=false`**. `no-tls` is a boolean flag in coturn's config; it does not accept `=false`. Setting it this way would still disable TLS (or be rejected). Removed the bogus line and clarified the comment: omit `no-tls`/`no-dtls` to keep TLS/DTLS enabled.
5. **Non-existent mediasoup option `iceConsentTimeout: 20`**. This is not a documented field of `WebRtcTransportOptions` in mediasoup v3. Removed to prevent runtime/typing errors.
6. **Broken IPv6 ICE candidate detection**. `event.candidate.candidate` is an SDP `candidate:` attribute — the `"candidate:"` prefix guarantees at least one colon — so `cand.includes(':')` is always true, misclassifying every IPv4 candidate as IPv6. Replaced with a check against the connection-address field (via `event.candidate.address` with a fallback to the 5th whitespace-separated token).
7. **Non-standard iptables persistence path `/etc/ip6tables/rules.v6`**. The standard path used by Debian/Ubuntu's `iptables-persistent` / `netfilter-persistent` is `/etc/iptables/rules.v6`. Corrected.

## Review Notes
- Janus has been migrating from INI (`.cfg`) to libconfig (`.jcfg`) for some years. The INI format is still supported, so the post's `.cfg` examples remain functional, though new deployments should prefer `.jcfg`.
- mediasoup v3.12+ prefers `listenInfos` over `listenIps`; `listenIps` is still supported for backward compatibility, so the existing example remains valid today. Future readers may want to migrate to `listenInfos`.
- The coturn config relies on `lt-cred-mech` with a static `user=` line, which is fine for demos but not recommended for production — use a database backend or REST API with ephemeral credentials.
- The firewall section does not open UDP 5349 (DTLS-SRTP for TURNS) — callers using DTLS to reach coturn's TLS port over UDP (uncommon) would need that. Left unchanged as TCP/TLS on 5349 is the standard path.
- `bundlePolicy: 'max-bundle'` and `rtcpMuxPolicy: 'require'` are the only sensible modern values and align with current WebRTC spec behavior.
