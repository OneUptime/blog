# Validation Summary: How to Understand the IPv6 Next Header Field

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6
- IPv6 extension headers
- Python
- `tcpdump`
- libpcap / BPF capture filters

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 4302: IP Authentication Header: https://www.rfc-editor.org/rfc/rfc4302
- RFC 4303: IP Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4303
- RFC 6275: Mobility Support in IPv6: https://www.rfc-editor.org/rfc/rfc6275
- libpcap `pcap-filter(7)` manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local verification with `tcpdump 4.99.4` / `libpcap 1.10.4` using `tcpdump -d 'ip6[6] == 58'`, `tcpdump -d 'ip6 protochain 58'`, and `tcpdump -d 'ip6 protochain 59'`

## Issues Found
1. **Incorrect generic parsing of AH and ESP**: The Python header walker treated AH, ESP, and other extension headers as if they all used the same length and chaining format. RFC 4302 defines AH length in 32-bit words minus 2, and RFC 4303 places ESP's Next Header field in the ESP trailer. I fixed the sample by parsing AH separately, stopping at ESP, and keeping the rest of the walk logic intact.
2. **Missing length validation in the parser**: The original sample advanced through variable-length headers without checking that the advertised header length fit inside the packet. I added bounds checks before accepting AH, Hop-by-Hop, Routing, Destination Options, and Mobility header lengths.
3. **Overly narrow `tcpdump` filters**: The original `ip6[6] == N` filters only test the base IPv6 header's Next Header byte and miss protocols that appear later in the extension-header chain. I replaced them with `ip6 protochain N`, which follows the IPv6 protocol header chain.
4. **Inaccurate `No Next Header` guidance**: The original examples suggested specific uses such as keep-alives and privacy payloads. RFC 8200 defines value 59 as "nothing follows this header" and requires any remaining octets to be ignored, so I updated that section to match the specification.

## Review Notes
- `pcap-filter(7)` notes that `ip6 protochain` is more accurate for chained IPv6 headers than `ip6[6]`, but it is slower and cannot be optimized by the BPF optimizer.
- The overview, diagrams, and the common Next Header values table were otherwise technically correct after checking against RFC 8200, RFC 6275, and the IANA protocol registry.
- The Python example remains a lightweight header walker rather than a full IPsec-aware dissector. Stopping at ESP is the correct limitation for a generic parser.
