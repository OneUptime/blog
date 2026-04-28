# Validation Summary: How to Understand NAT Types (Full Cone, Restricted, Symmetric)

## Status
validated

## Post Type
Reference / Explainer guide

## Technologies Covered
- NAT (Network Address Translation) — Full Cone, Restricted Cone, Port Restricted Cone, Symmetric
- RFC 3489 (original STUN spec, defining the four NAT types)
- STUN / TURN / ICE NAT traversal
- VoIP (SIP/RTP), WebRTC, P2P
- `stun-client` (Debian/Ubuntu package providing the `stun` CLI)
- `pynat` Python library
- Gaming console NAT classifications (PlayStation Type 1/2/3, Xbox Open/Moderate/Strict)

## Sources Consulted
- RFC 3489 — STUN: Simple Traversal of UDP Through NATs (https://datatracker.ietf.org/doc/html/rfc3489) — original definitions of the four NAT types (Full Cone, Restricted Cone, Port Restricted Cone, Symmetric)
- RFC 5389 / RFC 8489 — successors to RFC 3489 that deprecated the cone/symmetric classification (informational context only)
- pynat GitHub repo (https://github.com/aarant/pynat) — verified the public API
- Debian `stun-client` package documentation — verified CLI invocation `stun <server>[:port]`
- Google public STUN endpoint `stun.l.google.com:19302` — well-known and current

## Issues Found
- **`pynat` API call was incorrect.** The post used `pynat.get_nat_type()`, but pynat's actual public function is `get_ip_info()`, which returns `(topology, ext_ip, ext_port)`. Updated the Python snippet to import `get_ip_info` from `pynat` and use the correct return-tuple naming (`topology`). Verified against the pynat README on GitHub.

## Review Notes
- The post correctly attributes the four-type taxonomy to RFC 3489. Worth noting (not a correction) that RFC 3489 was obsoleted by RFC 5389 (and later RFC 8489), and RFC 4787 introduced more precise terminology ("Endpoint-Independent Mapping/Filtering", "Address-Dependent", "Address and Port-Dependent") because real-world NATs don't always fit the cone/symmetric model cleanly. The cone/symmetric vocabulary is still widely used in practice (especially in gaming and VoIP literature), so the post's framing is fine for its audience.
- The `stun-client` package and command invocation (`stun stun.l.google.com:19302`) are correct. Output wording can vary slightly between versions but the example is representative.
- Gaming console NAT-type mappings are approximate by nature (Sony/Microsoft don't publish a formal RFC mapping); the table reflects the commonly accepted equivalents and is reasonable.
- The statement "Most home routers use Port Restricted Cone or Symmetric NAT" is broadly accurate for consumer-grade NAT behavior.
