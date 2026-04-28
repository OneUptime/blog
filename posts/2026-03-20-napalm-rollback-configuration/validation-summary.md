# Validation Summary: How to Roll Back Network Configuration Changes with NAPALM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NAPALM (Network Automation and Programmability Abstraction Layer with Multivendor support)
- Python (3.x)
- Cisco IOS
- Arista EOS
- Juniper JunOS
- `napalm.get_network_driver` driver factory
- `load_merge_candidate`, `load_replace_candidate`, `compare_config`, `commit_config`, `discard_config`, `rollback`, `get_config`, `get_interfaces` methods
- Python `threading.Timer` for time-bounded confirmation

## Sources Consulted
- NAPALM Base NetworkDriver API: https://napalm.readthedocs.io/en/latest/base.html
- NAPALM Configuration Support Matrix: https://napalm.readthedocs.io/en/latest/support/index.html
- NAPALM Cisco IOS driver caveats: https://napalm.readthedocs.io/en/latest/support/ios.html
- NAPALM source on GitHub for driver constructor signatures (`hostname`, `username`, `password`, `timeout`, `optional_args`)

## Issues Found

1. **Non-existent `device.save_config()` call (Step 2).** The post invoked `device.save_config()` after a successful commit. NAPALM's public NetworkDriver API does not expose a `save_config()` method — calling it would raise `AttributeError`. On IOS, persistence to startup-config is already handled internally by `commit_config()` (it issues `write memory`). Replaced the line with an explanatory comment and a "Configuration kept." print so the example actually runs.

2. **Broken driver construction in Step 3 (`commit_with_timer`).** The original code called `driver_class(**device_info)`, but the example `device_info` dict (modeled on Step 2) contains a `driver` key and uses `host` rather than the constructor's required `hostname` parameter. Both would raise `TypeError`. Refactored to a small `_build_device()` helper that constructs the driver explicitly with `hostname`, `username`, `password`, and `optional_args` — matching the pattern used in Step 2 — and reused it in `auto_rollback()`.

## Review Notes
- The claim that "Cisco IOS does not natively support rollback through NAPALM" is technically defensible: per NAPALM's support matrix, the IOS driver only *emulates* rollback via `configure replace` (and requires `archive` on the device). The manual save-and-restore pattern shown in the post is a more portable approach and remains a reasonable recommendation.
- NAPALM 3.x and later have native commit-confirm support via `commit_config(revert_in=N)` paired with `confirm_commit()` / `has_pending_commit()` on supported drivers (Junos, EOS, IOS-XR, and IOS where `configure replace` is available). The Step 3 threading-based pattern works but reinvents functionality NAPALM provides natively; readers targeting Junos in particular may prefer the built-in API.
- The example `device.load_merge_candidate(config="interface Ethernet1\n description TEST\n")` in Step 1 relies on the EOS driver — the indentation/CLI form is correct for Arista EOS.
- `get_config(retrieve='running')['running']` is correct: NAPALM returns a dict with `running`, `startup`, and `candidate` keys.
- The Step 3 example does not include a sample call site; readers must construct `device_info` with `driver`, `host`, `username`, `password`, and optional `optional_args` keys (same shape as Step 2). A future revision could add an explicit invocation for clarity.
