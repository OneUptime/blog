# Validation Summary: How to Build IPv6 Network Inventory Tools - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- NAPALM
- Python
- `concurrent.futures.ThreadPoolExecutor`
- SQLite
- YAML

## Sources Consulted
- NAPALM base API documentation: https://napalm.readthedocs.io/en/latest/base.html
- NAPALM supported devices, getters support matrix, and optional arguments: https://napalm.readthedocs.io/en/latest/support/
- Python `concurrent.futures` documentation: https://docs.python.org/3/library/concurrent.futures.html
- Python `sqlite3` documentation: https://docs.python.org/3/library/sqlite3.html

## Issues Found
- The post used `peer_data["state"]` from `get_bgp_neighbors()`, but the documented NAPALM schema exposes `is_up` and `is_enabled` instead. I changed the sample to derive a readable state from those documented fields so the example matches the official API.
- The post stored the VRF `router_id` as `local_address`, which is not the same value. I changed the inventory model and collection code to store `router_id` explicitly.
- The interface inventory example hardcoded `enabled=True` and `mtu=1500` instead of collecting them from the device. I added a `get_interfaces()` lookup and now populate `is_enabled` and `mtu` from the documented getter output.
- The sample forced `optional_args={\"transport\": \"ssh\"}` for every driver. NAPALM documents transport support as driver-specific, so that setting is not valid for all supported platforms. I removed it from the generic example.
- The description and conclusion claimed the sample collected routing tables, but the code did not do that. I corrected those claims to match the implemented inventory workflow.

## Review Notes
- NAPALM getter support still varies by platform. The post now uses `get_interfaces()`, `get_interfaces_ip()`, and `get_bgp_neighbors()`, which are broadly supported in the official support matrix, but readers should still confirm support for their chosen driver.
- The `routes` field remains in the data model as an extension point, but the published sample does not currently populate it.
