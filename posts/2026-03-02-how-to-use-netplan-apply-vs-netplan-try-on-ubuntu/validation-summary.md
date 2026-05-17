# Validation Summary: How to Use netplan apply vs netplan try on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (Ubuntu network configuration tool)
- systemd-networkd
- NetworkManager
- YAML configuration
- Ubuntu networking

## Sources Consulted
- `netplan --help`, `netplan try --help`, `netplan apply --help`, `netplan generate --help` (local CLI verification)
- Official Netplan documentation: https://netplan.readthedocs.io/
- Netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Ubuntu Server networking docs: https://ubuntu.com/server/docs/network-configuration

## Issues Found
No technical issues found.

Verified items:
- `netplan try` default timeout is 120 seconds (confirmed via CLI).
- `--timeout TIMEOUT` flag accepts seconds (confirmed).
- `--debug` is a global option that precedes the subcommand (e.g., `netplan --debug generate`) — correctly shown in the post.
- `netplan generate` writes backend config to `/run/systemd/network/` for systemd-networkd and `/run/NetworkManager/system-connections/` for NetworkManager — correct.
- Static IP YAML example uses the modern `routes:` syntax with `to: default` / `via:` (the deprecated `gateway4:` is correctly avoided).
- Bonded interface example with `bonds:`, `interfaces:`, `parameters: mode: active-backup, primary:` is valid netplan YAML.
- The `netplan try` interactive prompt text shown in the post matches the real output.
- The order of operations described for `apply` and `try` (generate backend config → reload backend) accurately reflects how netplan works.

## Review Notes
- The post is technically accurate and follows current Netplan conventions.
- Minor nit (not corrected, stylistic): `netplan generate` does more than YAML syntax validation — it also performs schema validation and produces backend files. The post frames it primarily as a syntax check, which is a reasonable simplification for the audience.
- The post correctly recommends `routes:` over the long-deprecated `gateway4:` / `gateway6:` keys, which were removed in newer Netplan versions.
- For completeness, Netplan also supports pressing Ctrl-C during `netplan try` to revert immediately, but this is not essential to the post's message.
