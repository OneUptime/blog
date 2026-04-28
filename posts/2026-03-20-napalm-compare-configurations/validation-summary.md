# Validation Summary: How to Compare Running and Intended Configurations with NAPALM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NAPALM (Network Automation and Programmability Abstraction Layer with Multivendor support)
- Python 3 (pathlib, datetime, json)
- Cisco IOS (used as the example driver)
- Network configuration management / drift detection

## Sources Consulted
- NAPALM official documentation — Base API: https://napalm.readthedocs.io/en/latest/base.html
- NAPALM supported devices and capabilities: https://napalm.readthedocs.io/en/latest/support/index.html
- NAPALM tutorial on configuration management: https://napalm.readthedocs.io/en/latest/tutorials/index.html

## Issues Found
- **Incorrect method for drift detection**: All three code blocks (Step 1, Step 3) used `device.load_merge_candidate(filename=...)` to stage the intended config before calling `compare_config()`. This is the wrong choice for drift detection. The merge semantics produce a diff that only shows the *incremental additions* the candidate would introduce — it does not surface configuration that exists on the device but is absent from the intended baseline (i.e., unauthorized additions). For full drift detection you need `load_replace_candidate(filename=...)`, whose diff describes the complete transformation from running → intended (additions and removals). The NAPALM docs explicitly note "For merges, the diff is very simplistic." I changed the three call sites and the matching mention in the Conclusion to `load_replace_candidate()`.

## Review Notes
- The `get_config(retrieve='running')` / `get_config(retrieve='startup')` usage is correct — `get_config()` returns a dict with `running`, `startup`, and `candidate` keys (unrequested fields come back as empty strings).
- Comparing `running_config['running'] != startup_config['startup']` (Step 2) is technically valid, but in practice some platforms emit minor formatting differences (whitespace, banner lines, command-time timestamps) that can cause false positives. This is a known caveat of raw-string comparison rather than a code bug, so no change was made.
- `discard_config()` is correctly invoked after each `compare_config()` call — important because `load_replace_candidate` (after the fix) actually stages a candidate on the device that must be discarded to avoid leaving pending configuration changes.
- Not every NAPALM driver supports "Config. replace" with equal fidelity (the support matrix lists per-platform capabilities). On Cisco IOS, replace requires `archive` to be configured for `configure replace` to work; some readers may need to enable that. This is a deployment caveat rather than a code error.
- The exception handling in `check_drift` swallows `device.close()` if an exception occurs after `device.open()` — a `try/finally` would be slightly safer, but this is a stylistic improvement, not a correctness bug.
