# Validation Summary: How to Add Pre-Checks, Post-Checks, and Automatic Rollback to a Network Change

## Status
validated

## Post Type
Technical guide with a Python transaction-sequencing example.

## Technologies Covered
- Python exception handling and monotonic timing.
- NAPALM configuration loading, comparison, backup, confirmed commits, and rollback.
- NETCONF configuration locks and confirmed-commit capability.
- Network health assertions, BGP adjacency, VLAN changes, and traffic-path verification.
- Per-device change ownership, staged rollout, and recovery reconciliation.

## Sources Consulted
- NAPALM configuration tutorial: https://napalm.readthedocs.io/en/latest/tutorials/changing_the_config.html
- NAPALM support matrix and driver caveats: https://napalm.readthedocs.io/en/latest/support/index.html
- NAPALM NetworkDriver API reference: https://napalm.readthedocs.io/en/latest/base.html
- Official NAPALM Junos driver source, including load, discard, and commit implementations: https://github.com/napalm-automation/napalm/blob/develop/napalm/junos/junos.py
- NETCONF RFC 6241, especially sections 7.5, 8.3, and 8.4: https://datatracker.ietf.org/doc/html/rfc6241
- Python monotonic clock documentation: https://docs.python.org/3/library/time.html#time.monotonic
- Python built-in all() behavior: https://docs.python.org/3/library/functions.html#all
- Python exception handling and chaining: https://docs.python.org/3/tutorial/errors.html
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
1. Candidate-load failures skipped cleanup. The original `loaded` flag was set only after `load_merge_candidate()` returned successfully. A load that reached the device but then failed or lost its reply could leave candidate state without attempting to discard it. Replaced the flag with `attempted_load`, set before the call, so pre-commit failures attempt cleanup under the stated exclusive-ownership assumption. Some drivers clean up particular load errors themselves, but that does not establish cleanup for every failure, including transport errors.
2. Cleanup errors could replace the primary failure. If `discard_config()` raised in the exception handler, callers received that exception instead of the original transaction error. The handler now re-raises the original exception with the cleanup exception explicitly chained, retaining both failures and keeping the transaction failure primary.

## Review Notes
- Verified the NAPALM API names, arguments, configuration dictionary access, diff handling, timer units, confirmation, and rollback sequencing against official documentation. No deprecated API usage was identified.
- The documentation supports the post's warning that feature availability varies by driver and operation. The Junos driver requires timer values divisible by 60; the example's 300 seconds meets that requirement. Exact device releases still require lab validation.
- Confirmed the distinction between device-side recovery and a controller that must reconnect, and between device-level mechanisms and network-wide atomicity. NETCONF session loss can cause rollback before the timer expires when the commit is not persistent.
- Confirmed that Python all() accepts an empty iterable as true and that monotonic clock differences are appropriate for elapsed-time checks.
- The verification and backup callbacks, configuration ownership, approval-baseline comparison, timeouts, and final reconciliation are explicitly caller responsibilities. The sample is a sequencing illustration, not a complete deployment application. Device RPC timeouts as well as callback deadlines must fit the confirmation budget; a post-callback elapsed-time check cannot interrupt blocked I/O.
- Backup retrieval is unsanitized by default, consistent with the requirement for restricted storage. Driver-specific default configuration rendering and restoration behavior should be rehearsed.
- Traffic probes, convergence windows, redundant-pair serialization, and canary rollout are sound operational recommendations; their exact assertions and timing depend on the topology and service.
- All original external links resolved to the intended resources. The post contains no terminal commands, standalone configuration snippets, or pinned version claims requiring separate validation.
- Compiled the extracted Python example and exercised 10 simulated scenarios: successful confirmation, unchanged candidate, load failure, comparison failure, cleanup failure preserving the original error, commit failure, confirmation failure, exhausted time budget, existing pending commit, and failed post-check. All passed. These checks do not validate real device behavior; no live network device was available or modified.
