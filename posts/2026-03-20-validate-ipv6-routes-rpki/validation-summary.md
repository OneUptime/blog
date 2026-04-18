# Validation Summary: How to Validate IPv6 Route Origins with RPKI

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- RPKI (Resource Public Key Infrastructure)
- IPv6 BGP routing
- Routinator (NLnet Labs RPKI validator)
- BIRD2 routing daemon
- FRRouting (FRR)
- RTR (RPKI-to-Router) protocol
- Python (requests library) for HTTP API validation

## Sources Consulted
- Routinator documentation: https://routinator.docs.nlnetlabs.nl/en/stable/
  - `vrps` subcommand: https://routinator.docs.nlnetlabs.nl/en/stable/vrps.html
  - `dump` subcommand: https://routinator.docs.nlnetlabs.nl/en/stable/dump.html
  - Validity checker: https://routinator.docs.nlnetlabs.nl/en/stable/validity-checker.html
  - HTTP API endpoints: https://routinator.docs.nlnetlabs.nl/en/stable/api-endpoints.html
  - HTTP service (default port 8323) / RTR service (examples use 3323)
- BIRD 2 user guide, Section 6.16 RPKI: https://bird.network.cz/
- FRRouting RPKI documentation: https://docs.frrouting.org/
- RFC 6480 (RPKI architecture) and RFC 6811 (BGP Prefix Origin Validation)

## Issues Found

1. **Incorrect Routinator subcommand for dumping VRPs.** The post used `routinator dump --format csv` to produce validated ROA payloads in CSV. `routinator dump` writes internal repository cache contents (RRDP/rsync data, trust anchors) for debugging and does not accept `--format`. The correct command for exporting VRPs in CSV is `routinator vrps --format csv`. Fixed by replacing the command and updating the comment from "validated ROAs" to "validated ROA payloads (VRPs)".

2. **Quoted IPv6 address in BIRD2 RPKI `remote` directive.** The post had `remote "::1" port 3323;`. In BIRD2's RPKI protocol grammar (`remote <ip> | "<domain>" [port <num>]`), a quoted string is interpreted as a hostname to be DNS-resolved, while IP literals (v4 or v6) must be unquoted tokens. Changed to `remote ::1 port 3323;` so BIRD2 parses it as the loopback IPv6 address.

## Review Notes

- The RPKI validation state table (VALID / INVALID / NOT FOUND) is consistent with RFC 6811 semantics.
- Routinator's default HTTP port (8323) used in the Python example is correct. Note: the IANA-assigned default for RTR is 323 (privileged), but Routinator examples use 3323 to avoid running as root; the post is consistent with Routinator's own documentation on this.
- The Routinator HTTP validity endpoint `/api/v1/validity/<asn>/<prefix>` is correct. The JSON traversal in the Python script (`validated_route.validity.state`) matches the documented response shape.
- The BIRD2 `roa_check(table, net, bgp_path.last)` usage and return values (`ROA_VALID`, `ROA_INVALID`, `ROA_UNKNOWN`) are accurate. The choice to accept `ROA_UNKNOWN` is a policy decision and the post correctly calls this out in a comment.
- The FRR commands inside the `rpki` configuration block (`rpki polling_period`, `rpki cache <ip> <port> preference <pref>`) are valid for modern FRR releases. Newer FRR versions also accept a simplified form (dropping the `rpki` prefix inside the block), but the documented form still works and is widely shown in the official FRR manual.
- The code fence language for the BIRD2 configuration block is labelled `python`, which is inaccurate as a syntax-highlighting hint. Left as-is since it does not affect technical correctness of the content.
