# Validation Summary: How to Set Up Polkit Rules for Privilege Escalation on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Polkit (formerly PolicyKit) — JavaScript-based `.rules` and legacy `.pkla` rule formats
- `pkaction`, `pkcheck` CLI tools
- systemd unit management (`org.freedesktop.systemd1.manage-units`)
- NetworkManager polkit actions (`org.freedesktop.NetworkManager.*`)
- udisks2 polkit actions (`org.freedesktop.udisks2.*`)
- systemd-logind actions (`org.freedesktop.login1.*`)
- Ubuntu (22.04, 24.04)

## Sources Consulted
- polkit upstream documentation: https://www.freedesktop.org/software/polkit/docs/latest/
- `polkit(8)` manpage and JavaScript Authority Rules section
- `pkaction(1)` and `pkcheck(1)` manpages (verified locally on Ubuntu 24.04 with polkit 124-2ubuntu1.24.04.3)
- Ubuntu package metadata: `polkitd` and `polkitd-pkla` (24.04)
- polkit upstream CHANGELOG / NEWS regarding pklocalauthority backend
- NetworkManager polkit policy file (`org.freedesktop.NetworkManager.policy`)
- systemd source for manage-units polkit details (`unit`, `verb` lookup keys)

## Issues Found

1. **Outdated claim about `.pkla` availability on current Ubuntu** — The post stated that `.pkla` files "still work on current Ubuntu." On Ubuntu 24.04 (polkit 124), the legacy `pklocalauthority` backend has been split into a separate optional package (`polkitd-pkla`) that is NOT installed by default. I updated the section to mention this and added the `apt install polkitd-pkla` step that users on 24.04+ need.

2. **Misleading "simulate authorization" example** — The post said "Or use `polkit` to simulate authorization" followed by `sudo -u deployuser pkaction --action-id ... --verbose`. Two problems: there is no `polkit` CLI command, and `pkaction` only prints the static action definition from the policy XML — it does not run per-user authorization simulation, so prefixing with `sudo -u` is meaningless. Rewrote the intro to describe what the command actually does (showing the action's implicit defaults) and removed the `sudo -u`.

## Review Notes
- All JavaScript rule examples are syntactically valid for the polkit Authority API: `polkit.addRule`, `action.id`, `action.lookup("key")`, `subject.user`, `subject.isInGroup`, and the `polkit.Result.*` constants (YES, NO, AUTH_SELF, AUTH_ADMIN, AUTH_SELF_KEEP, AUTH_ADMIN_KEEP) are all correct.
- The systemd `manage-units` detail keys `unit` and `verb` are correct and match what systemd passes to polkit.
- All action IDs used as examples (`org.freedesktop.NetworkManager.network-control`, `wifi.share.open`, `settings.modify.system`, `udisks2.filesystem-mount`, `login1.reboot`, `systemd1.manage-units`) are real, currently-registered actions.
- Rule precedence claim ("Lower-numbered files take precedence") is correct: rules are evaluated in lexical/registration order and the first rule returning a non-undefined `polkit.Result` wins; later rules for the same action will not run.
- `pkcheck --process PID --enable-internal-agent` is valid — the manpage shows `--process PID[,START_TIME,UID]`, so the single-PID form still works, though the full triplet is more robust against PID reuse / TOCTOU.
- `pkaction --verbose` output fields ("implicit any", "implicit inactive", "implicit active") were verified against actual output on Ubuntu 24.04.
- `polkit.service` is the correct systemd unit name on current Ubuntu — `systemctl restart polkit` and `journalctl -u polkit` both work as written.
- The `.pkla` `ResultAny` / `ResultInactive` / `ResultActive` fields and `Identity=unix-group:` syntax are correct for the legacy backend.
