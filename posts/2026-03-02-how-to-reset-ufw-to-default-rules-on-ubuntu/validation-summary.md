# Validation Summary: How to Reset UFW to Default Rules on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- iptables / netfilter
- Ubuntu Linux administration
- Bash scripting
- SSH access considerations

## Sources Consulted
- `ufw(8)` man page (May 2023 version, shipped with Ubuntu)
- UFW Python source in `/usr/lib/python3/dist-packages/ufw/` — specifically `frontend.py` (`reset()` method), `backend_iptables.py` (`reset()` and `stop_firewall()` methods), and `parser.py` (default-policy direction handling)
- `/lib/ufw/ufw-init` and `/lib/ufw/ufw-init-functions` (specifically `ufw_stop()` which calls `delete_chains` and resets INPUT/OUTPUT/FORWARD policies to ACCEPT)
- Default `/etc/default/ufw` template (DEFAULT_INPUT_POLICY="DROP", DEFAULT_OUTPUT_POLICY="ACCEPT", DEFAULT_FORWARD_POLICY="DROP")
- Default `/usr/share/ufw/iptables/user.rules` template

## Issues Found

1. **Incorrect description of default-policy behavior after reset.** The post originally claimed `ufw reset` "Resets default policies to 'allow incoming' (permissive) rather than the restrictive defaults." Verification of `frontend.py` and `backend_iptables.py` shows that `ufw reset` only disables UFW, backs up the `*.rules` files, and copies the framework templates from `/usr/share/ufw/iptables/` into `/etc/ufw/`. It never touches `/etc/default/ufw`, so the configured default policies persist across a reset. Corrected the bullet to: "Does not modify the default policies in `/etc/default/ufw` — they persist across the reset, but only take effect once UFW is re-enabled."

2. **Incorrect description of iptables state after reset.** The "Verifying Clean State After Reset" section originally said "the iptables will show the UFW chains but without your custom rules populated - just the framework rules that UFW installs by default." Checking `ufw_stop()` in `/lib/ufw/ufw-init-functions` confirms that disabling UFW (which `reset` does) calls `delete_chains` and explicitly sets the built-in INPUT/OUTPUT/FORWARD policies to ACCEPT, removing the UFW-managed chains entirely. Corrected to describe that after reset the built-in chains have policy ACCEPT and the UFW chains are removed until UFW is re-enabled.

## Review Notes

- `ufw default deny forward` is valid even though the `ufw(8)` man page documents only `incoming|outgoing|routed`. The parser in `/usr/lib/python3/dist-packages/ufw/parser.py` explicitly accepts `"forward"` as an alias for `"routed"`, so this command works as written. Kept as-is.
- The example reset output (`Resetting all rules to installed defaults. Proceed with operation (y|n)?`) matches the non-SSH prompt. When invoked over an SSH session, UFW also prints a warning about disrupting existing SSH connections, but the simpler prompt shown here is correct for non-SSH invocations.
- The example backup timestamps use the format `YYYYMMDD_HHMMSS` (e.g., `20260302_143022`), which matches the format produced by `time.strftime("%Y%m%d_%H%M%S")` in `backend_iptables.py:1400`.
- The `ufw reset` command does back up all six `.rules` files (`user.rules`, `before.rules`, `after.rules`, and their IPv6 counterparts) as the example output shows. Verified in the loop at `backend_iptables.py:1390-1393` which iterates over all `.rules` files in `self.files`.
- The advice to keep `set -e` together with `ufw --force reset` and `ufw --force enable` is safe — both commands return 0 on success and use `--force` to skip interactive prompts.
- The note about active connections (kernel conntrack continues to pass established flows) is correct: UFW does not flush conntrack on disable, so existing TCP sessions persist.
