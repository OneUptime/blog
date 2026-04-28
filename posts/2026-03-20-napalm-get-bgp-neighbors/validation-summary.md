# Validation Summary: How to Use NAPALM get_bgp_neighbors to Monitor BGP Sessions

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NAPALM (Network Automation and Programmability Abstraction Layer with Multivendor support)
- BGP (Border Gateway Protocol)
- Python 3 (concurrent.futures, datetime, json, os)
- Cisco IOS, Arista EOS (NAPALM drivers)

## Sources Consulted
- NAPALM official documentation: https://napalm.readthedocs.io/en/latest/base.html (NetworkDriver constructor signature, get_bgp_neighbors return structure)
- NAPALM support matrix: https://napalm.readthedocs.io/en/latest/support/index.html (driver support for get_bgp_neighbors)
- NAPALM `get_bgp_neighbors` returns a dict keyed by VRF (or 'global') with `router_id` and `peers`; each peer dict has `local_as`, `remote_as`, `remote_id`, `is_up`, `is_enabled`, `description`, `uptime`, and `address_family` (with `received_prefixes`, `accepted_prefixes`, `sent_prefixes` per AF)

## Issues Found
1. **Misleading description of session state in the capabilities bullet list.** The original post claimed NAPALM returns "Session state (established, active, idle)". NAPALM's `get_bgp_neighbors()` does not expose the BGP FSM state — it only exposes `is_up` and `is_enabled` boolean flags. Rewrote the bullets to accurately describe the returned fields (`local_as`, `remote_as`, `remote_id`, `is_up`, `is_enabled`, prefix counts, uptime, description), without restructuring the section.

2. **Bug in Step 4 — `get_current_prefixes([])` passed an empty device list.** The original code defined `get_current_prefixes(devices)` to iterate over a `devices` argument, but called it twice with `[]`, which would silently return an empty dict and the script would never collect any prefix counts. Added a `DEVICES` placeholder list at the top of the snippet and replaced both `get_current_prefixes([])` calls with `get_current_prefixes(DEVICES)` so the example actually works when the reader fills in their own devices.

## Review Notes
- The driver constructor calls (both keyword-based in Step 1/Step 3 and positional in Step 2) match NAPALM's `(hostname, username, password, timeout=60, optional_args=None)` signature.
- The example output structure in Step 1 (router_id, peers, is_up, is_enabled, uptime, remote_as, description, address_family with received/accepted/sent prefixes) matches NAPALM's documented return value.
- A received prefix count of 800,000 is plausible for a recent (2024-2026) full IPv4 BGP table peer.
- AS 65001 is in the private 16-bit ASN range (64512–65534), appropriate for examples.
- The conclusion's claim that the same pattern works for IOS, NX-OS, EOS, and JunOS is consistent with the NAPALM support matrix (all four vendors support `get_bgp_neighbors`).
- Future improvement (not a correctness issue): hardcoded plaintext credentials in examples should ideally be replaced with environment variables or a secrets manager in production code; the post does not call this out.
