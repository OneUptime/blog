# Validation Summary: How to Configure Zigbee IP with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Zigbee IP (ZIP) / Connectivity Standards Alliance (CSA, formerly Zigbee Alliance)
- IEEE 802.15.4 radio
- 6LoWPAN (RFC 4944, RFC 6282)
- IPv6 / SLAAC / DHCPv6
- RPL routing (RFC 6550)
- Linux `iwpan` / `ip link` 6LoWPAN tooling
- Contiki-NG `rpl-border-router`
- CoAP (`aiocoap` Python library)
- Zigbee Cluster Library (ZCL)
- Smart Energy Profile 2.0 / IEEE 2030.5
- TLS / OpenSSL (EC key + X.509 certificate generation)
- tcpdump, ip neigh, ping6

## Sources Consulted
- RFC 4944 — Transmission of IPv6 Packets over IEEE 802.15.4
- RFC 6282 — Compression Format for IPv6 over 802.15.4
- RFC 6550 — RPL: IPv6 Routing Protocol for Low-Power and Lossy Networks
- IEEE 2030.5 / Smart Energy Profile 2.0 — mandates TLS 1.2 over TCP (not DTLS) with ECC cipher suites
- `iwpan` / `wpan-tools` documentation (linux-wpan)
- Linux kernel 6LoWPAN interface docs (`ip link ... type lowpan`)
- Contiki-NG `rpl-border-router` example (contiki-ng/contiki-ng on GitHub)
- `aiocoap` Python library documentation (`Context.create_client_context`, `Message`)
- Connectivity Standards Alliance (CSA) — successor to the Zigbee Alliance

## Issues Found

1. **Invalid IPv6 addresses with non-hex characters.** The post used `2001:db8:zip:1::1/64` and `2001:db8:zip:1::meter1`. IPv6 hextets only accept `0-9` and `a-f`, so `zip` and `meter1` are malformed (letters `z`, `i`, `p`, `m`, `t`, `r` are not valid hex digits). Replaced with valid documentation-range addresses `2001:db8:1::1/64` and `2001:db8:1::100` in the border-router assignment, Python CoAP example, and `ping6` command.

2. **Incorrect security transport (DTLS → TLS).** The section claimed "Zigbee IP mandates DTLS for secure communication." The Zigbee IP / SEP 2.0 (IEEE 2030.5) specification actually mandates **TLS 1.2 over TCP** using ECC cipher suites (ECDHE-ECDSA with prime256v1/secp256r1), not DTLS. Renamed the section to "TLS Security for Zigbee IP" and corrected the comment to reflect TLS 1.2/TCP with ECC.

3. **Conclusion overstated CoAP as the primary application interface.** Changed "end-to-end encrypted communication via DTLS" to "via TLS" and clarified that the RESTful interface is HTTP-based (with CoAP as an alternative over constrained links), which matches SEP 2.0 reality.

## Review Notes
- The CoAP code example (`aiocoap`) remains as a plausible demonstration. Strictly speaking, SEP 2.0 on Zigbee IP uses HTTP(S) with XML/EXI payloads rather than CoAP, and the URI path `/zcl/metering` is illustrative rather than standardized. The example is technically valid Python that correctly uses `aiocoap.Context.create_client_context()` and `aiocoap.Message(code=aiocoap.GET, uri=...)`, so it was left in place as an IP-layer example.
- `ping6` is deprecated on many modern Linux distributions in favor of `ping -6` (iputils merged the binaries), but `ping6` still exists and works on most systems — left unchanged.
- The `iwpan` commands assume the `wpan-tools` package is installed and `phy0`/`wpan0` are the correct device names; this is standard but environment-specific.
- `2001:db8::/32` is correctly used as the IETF-reserved documentation prefix (RFC 3849).
- The Contiki-NG `rpl-border-router` example path and `make TARGET=native` invocation match the current repository layout.
