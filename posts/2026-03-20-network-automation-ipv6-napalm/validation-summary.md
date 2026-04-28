# Validation Summary: How to Use NAPALM for IPv6 Network Automation

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NAPALM (Network Automation and Programmability Abstraction Layer with Multivendor support)
- Python (`ipaddress`, `concurrent.futures.ThreadPoolExecutor`)
- IPv6 addressing
- Cisco IOS-XR, Cisco IOS, Cisco NX-OS, Juniper JunOS, Arista EOS
- BGP (IPv6 neighbor inspection)

## Sources Consulted
- NAPALM GitHub repository — https://github.com/napalm-automation/napalm
- NAPALM `setup.py` and `requirements.txt` (to verify install/extras behavior)
- NAPALM `_SUPPORTED_DRIVERS.py` — https://github.com/napalm-automation/napalm/blob/master/napalm/_SUPPORTED_DRIVERS.py
- NAPALM base API documentation — https://napalm.readthedocs.io/en/latest/base.html
- NAPALM getter return-type contracts for `get_interfaces_ip()` and `get_bgp_neighbors()`
- Cisco IOS-XR CLI reference for `interface` / `ipv6 address` syntax
- RFC 4291 (IPv6 addressing architecture — hex-only digit constraint)

## Issues Found

1. **Non-existent vendor-specific pip extras.** The original Installation section recommended `pip install napalm[ios]`, `napalm[iosxr]`, `napalm[junos]`, `napalm[eos]`, and `napalm[nxos_ssh]`. NAPALM's `setup.py` has no `extras_require` block; all vendor drivers (and their underlying SDKs — `pyeapi`, `netmiko`, `junos-eznc`, `ncclient`, etc.) are pulled in by the base `pip install napalm`. Following the original instructions would either install no extra (silently) or fail on stricter pip resolvers. **Fix:** replaced the multi-line install block with a single `pip install napalm` and a one-sentence note that all drivers are bundled and that NAPALM 5.x requires Python 3.9+.

2. **Invalid IPv6 placeholder addresses.** The example connection target `2001:db8::router1` and the multi-device list entries `2001:db8::r1`, `2001:db8::r2`, `2001:db8::r3` are syntactically invalid IPv6 literals — IPv6 segments are restricted to hex digits `0-9a-f` (RFC 4291), and `r`/`o`/`u`/`t` are not hex. Code copied verbatim would raise an `ipaddress`/socket error before NAPALM ever opens a connection. **Fix:** changed `2001:db8::router1` to `2001:db8::1` and `r1`/`r2`/`r3` to `a1`/`a2`/`a3` (valid hex placeholders that preserve the original mnemonic intent).

## Review Notes
- All NAPALM API calls used in the post (`get_network_driver`, `open`/`close`, `get_interfaces_ip`, `get_bgp_neighbors`, `load_merge_candidate`, `compare_config`, `commit_config`, `discard_config`, `get_facts`) are correct and current as of NAPALM 5.x. The return-shape access patterns (e.g., `data["ipv6"][addr]["prefix_length"]`, `vrf_data["peers"][peer_ip]`) match the documented getter contracts.
- The IOS-XR config snippet (`interface ... / ipv6 address X/Y / no shutdown / !`) is valid CLI for `load_merge_candidate(config=...)`.
- The platform identifiers `iosxr`, `junos`, `eos`, `ios`, `nxos_ssh` are all in NAPALM's `_SUPPORTED_DRIVERS` list.
- Minor stylistic note (not changed): `import ipaddress` inside the loop in `get_ipv6_bgp_neighbors` works but would be more idiomatic at module scope. Functionally correct, so left as-is per "fix only what is technically wrong."
- Caveat for readers: `ThreadPoolExecutor` works because NAPALM operations are I/O-bound (SSH/NETCONF), but credentials in the example are hard-coded — a production audit script should pull them from a secret store.
