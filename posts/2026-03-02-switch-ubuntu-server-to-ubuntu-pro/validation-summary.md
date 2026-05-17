# Validation Summary: How to Switch from Ubuntu Server to Ubuntu Pro

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Server (LTS)
- Ubuntu Pro (Canonical subscription)
- `pro` / `ua` CLI (ubuntu-advantage-tools / ubuntu-pro-client)
- ESM-Infra and ESM-Apps (Expanded Security Maintenance)
- Canonical Livepatch
- FIPS 140-2 cryptographic modules
- Ubuntu Security Guide (USG) — CIS and DISA-STIG profiles
- APT package management

## Sources Consulted
- Ubuntu Pro Client CLI reference: https://documentation.ubuntu.com/pro-client/en/latest/references/commands/
- `pro status` columns explanation: https://documentation.ubuntu.com/pro-client/en/v32/explanations/status_columns/
- `security-status` explanation: https://documentation.ubuntu.com/pro-client/en/v30/explanations/how_to_interpret_the_security_status_command/
- About ESM: https://documentation.ubuntu.com/pro-client/en/v29/explanations/about_esm.html
- Ubuntu ESM overview: https://ubuntu.com/security/esm
- Ubuntu Pro personal use Terms of Service: https://canonical.com/legal/ubuntu-pro/personal
- How to enable CIS or USG: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_cis/
- USG CIS compliance docs: https://ubuntu.com/security/certifications/docs/usg/cis/compliance
- Livepatch status docs: https://ubuntu.com/security/livepatch/docs/livepatch/how-to/status
- 15-year Legacy add-on announcement: https://canonical.com/blog/canonical-expands-total-coverage-for-ubuntu-lts-releases-to-15-years-with-legacy-add-on

## Issues Found

1. **`pro accounts` command does not exist.** The "Verifying the Attachment" section used `pro accounts` to retrieve account information. This subcommand existed in older `ua` (ubuntu-advantage-tools) releases but was removed in the modern `pro` client (29.x+). The current top-level subcommands are: `api, attach, auto-attach, collect-logs, config, detach, disable, enable, fix, help, refresh, security-status, status, system`. Fix: removed the `pro accounts` line. Account/subscription metadata is already shown by `pro status`.

2. **Misleading comment about token display.** The comment "Which token is attached" above `pro status | head -20` was incorrect — `pro status` deliberately does not display the contract token value, only account, subscription, machine ID, and entitlement information. Fix: changed the comment to "Account, subscription, and machine ID summary" to accurately describe the output.

3. **CIS service enablement is outdated on Ubuntu 20.04+.** The "CIS Hardening" section ran `sudo pro enable cis`, but per Canonical's docs, on Ubuntu 20.04 LTS (Focal) and later the legacy `cis` service was replaced by `usg`, which provides both CIS and DISA-STIG profiles via the same `usg` CLI used in the subsequent commands. Fix: changed `sudo pro enable cis` to `sudo pro enable usg` and updated the comment to clarify USG provides the CIS profiles on Ubuntu 20.04+.

## Review Notes
- Ubuntu Pro free-for-personal-use limit (5 machines) is current as of 2026 per Canonical's personal-use ToS. Up to 50 machines is available for official Ubuntu Community members; VMs/containers are unlimited.
- ESM-Apps coverage of "23,000+ packages" matches Canonical's own documentation (Universe contains "over 23,000 packages per release").
- ESM-Infra extending LTS coverage to 10 years (5 standard + 5 ESM) is accurate. Note: Canonical's 2024–2025 Legacy add-on can push total LTS coverage further (12 then 15 years), but that is a separate add-on, not ESM-Infra itself — the post correctly scopes its claim to ESM-Infra.
- The example `pro status` output table lists both `cis` and `usg` as entitled services. In practice, only one is available on a given release (`cis` on 18.04; `usg` on 20.04+). This is acceptable as an illustrative example but readers on a specific release will see only the relevant one.
- All other commands verified: `pro attach`, `pro detach`, `pro status`, `pro status --all`, `pro enable livepatch|fips|usg`, `pro security-status`, `pro security-status --esm-apps`, `canonical-livepatch status [--verbose]`, `/proc/sys/crypto/fips_enabled`, and `usg audit|fix cis_level1_server|disa_stig` are all current and correct.
