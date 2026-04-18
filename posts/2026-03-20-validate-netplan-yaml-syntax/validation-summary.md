# Validation Summary: How to Validate Netplan YAML Syntax Before Applying

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Netplan (Ubuntu network configuration tool)
- YAML
- systemd-networkd (backend)
- Python PyYAML
- yamllint

## Sources Consulted
- Netplan CLI help: `netplan generate --help` and `netplan try --help` (verified against local install at /usr/sbin/netplan)
- Netplan documentation: https://netplan.readthedocs.io/en/latest/netplan-generate/
- Netplan documentation: https://netplan.readthedocs.io/en/latest/netplan-try/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan file permission warning (0.106+): https://netplan.readthedocs.io/en/latest/release-notes/
- PyYAML docs: https://pyyaml.org/wiki/PyYAMLDocumentation
- yamllint docs: https://yamllint.readthedocs.io/

## Issues Found

1. **Invalid `--config` flag on `netplan generate`**
   - The post showed `netplan generate --config /etc/netplan/01-netcfg.yaml 2>&1` as a way to validate a single file.
   - This is incorrect: `netplan generate` does not accept a `--config` (or `--config-file`) option. The only supported flags are `--debug`, `--root-dir`, and `--mapping`. `--config-file` is a flag of `netplan try`, not `netplan generate`.
   - Netplan intentionally parses all files in `/etc/netplan/` as a merged unit; single-file validation via the `generate` subcommand is not supported.
   - Fix: Replaced the command with `netplan generate --debug 2>&1` and updated the comment to explain that Netplan always parses all files together, and that `--debug` gives the verbose output needed to pinpoint which file triggered an error.

## Review Notes

- `netplan try` default timeout of 120 seconds is correct (matches the upstream default).
- The `chmod 600` recommendation aligns with Netplan 0.106+ behavior (shipped in Ubuntu 23.10 and 24.04 LTS), which warns about non-root-only permissions on `/etc/netplan/` files. On some versions/paths this manifests as a warning rather than a hard rejection, but the guidance to set `600` + `root:root` is the correct posture.
- YAML error examples (tab indentation, missing colon, missing list dash) are accurate and common real-world mistakes.
- `python3 -c "import yaml; yaml.safe_load(...)"` is correct for syntax validation; note it only catches YAML-level errors, not Netplan schema errors (the post's flow — YAML check first, then `netplan generate` — handles both layers correctly).
- The generated output path `/run/systemd/network/` is correct for the default systemd-networkd backend; NetworkManager-backed configs would land under `/run/NetworkManager/` instead, though the post's focus on the default (networkd) makes this omission acceptable.
- `yamllint` will flag style warnings (e.g., line length, document-start) that Netplan does not care about — worth mentioning to readers that yamllint output may include non-fatal style nits.
