# Validation Summary: How to Configure WebRTC with IPv6 ICE Candidates

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- WebRTC (RTCPeerConnection, ICE)
- IPv6 networking
- STUN / TURN protocols
- coturn (STUN/TURN server)
- JavaScript (browser WebRTC API)
- ip6tables / netfilter-persistent (Linux firewall)
- coturn client utilities (turnutils_stunclient, turnutils_uclient)

## Sources Consulted
- W3C WebRTC 1.0 spec (§4.3.2 RTCConfiguration): https://www.w3.org/TR/webrtc/#dom-rtcconfiguration-icecandidatepoolsize
- RFC 9429 (JSEP) §3.5.4 for iceCandidatePoolSize semantics: https://www.rfc-editor.org/rfc/rfc9429
- MDN RTCIceCandidate reference: https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/address
- coturn example turnserver.conf: https://github.com/coturn/coturn/blob/master/examples/etc/turnserver.conf
- coturn source (stunclient.c and mainuclient.c getopt strings) for CLI flag verification
- RFC 6156 (TURN IPv6 extension) for the `-x` (request IPv6 relay) semantics
- Debian `netfilter-persistent` / `iptables-persistent` plugin for the canonical `/etc/iptables/rules.v6` path
- RFC 5245 / RFC 8445 (ICE) for candidate attribute format

## Issues Found
1. **Incorrect iptables-persistent path.** The post wrote `sudo ip6tables-save > /etc/ip6tables/rules.v6`. The canonical path used by `netfilter-persistent` on Debian/Ubuntu is `/etc/iptables/rules.v6` (there is no `/etc/ip6tables/` directory). Fixed.
2. **Misleading comment on `iceCandidatePoolSize`.** The post labelled it "Enable IPv6 candidates". Per the W3C WebRTC spec and RFC 9429 §3.5.4, this setting only controls the size of the prefetched ICE candidate pool; IPv6 candidates are gathered automatically by the ICE agent on IPv6-capable hosts and are not gated by this property. Replaced the comment with an accurate description.
3. **Broken IPv6 detection check.** The post used `cand.includes(':')` to detect IPv6, but every ICE candidate string starts with the literal `candidate:` prefix, so the check is always true and incorrectly classifies IPv4 candidates as IPv6. Changed to check `event.candidate.address.includes(':')` (the raw IP field, per MDN), which correctly distinguishes IPv6 (contains `:`) from IPv4 (contains `.`).
4. **Invalid CLI flag `-6` on coturn utilities.** Both `turnutils_stunclient` and `turnutils_uclient` do not accept a `-6` option (verified by inspecting their `getopt` strings in coturn source). For `turnutils_stunclient`, removed the flag — resolving an AAAA record (or passing an IPv6 literal) is how you exercise the IPv6 path. For `turnutils_uclient`, replaced `-6` with `-x`, which per RFC 6156 requests an IPv6 relay address allocation from the TURN server.

## Review Notes
- The `RTCIceCandidate.address` property is not supported in Firefox (as of the last checked MDN reference). Production code that needs cross-browser coverage typically falls back to parsing the SDP `candidate` attribute string — fine to keep the simpler API call in a tutorial, but worth noting.
- The sample IPv6 addresses used in the post (e.g., `2001:db8::client`, `2001:db8::turn-server`) are intended as descriptive placeholders and contain non-hex characters; they are not valid IPv6 addresses. Left as-is since the intent is clearly illustrative and the text signals they must be replaced, but readers should substitute real `2001:db8::/32` documentation addresses (valid hex) before using any of these snippets verbatim.
- The `filterCandidates` function uses `cand.includes(' 2001:') || cand.includes(' fd')` to detect global unicast / ULA addresses. This is a simplification — it misses other global unicast ranges (e.g., `2a00::/12`, `2400::/12`, `2600::/12`). Acceptable for a tutorial example, but a production filter should be stricter.
- The coturn configuration is valid: `listening-ip`, `external-ip`, `relay-ip`, `lt-cred-mech`, etc. are all real options (verified against upstream `turnserver.conf` example). `relay-ip` is distinct from `min-port`/`max-port` and is correctly used here for the IPv6 relay bind address.
