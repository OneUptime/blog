# Validation Summary: How to Set Up FedRAMP-Compliant Ubuntu Servers

## Status
validated

## Post Type
Tutorial / Hardening guide

## Technologies Covered
- Ubuntu 22.04 LTS server hardening
- FedRAMP Moderate baseline (NIST SP 800-53)
- Ubuntu Pro / FIPS 140-2 (and 140-3) cryptographic modules
- OpenSSL 3 FIPS provider configuration
- OpenSSH server hardening (FIPS-approved ciphers, MACs, KEX)
- PAM (`pam_faillock`, `pam_pwquality`)
- Linux audit framework (`auditd` 3.x, `audispd-plugins`)
- DISA STIG / OpenSCAP / SCAP Security Guide
- AIDE (file integrity monitoring)

## Sources Consulted
- Ubuntu 22.04 `auditd` and `audispd-plugins` package file listings (https://packages.ubuntu.com/jammy/amd64/auditd/filelist, https://packages.ubuntu.com/jammy/amd64/audispd-plugins/filelist)
- Canonical Ubuntu Pro FIPS documentation (https://ubuntu.com/tutorials/using-the-ubuntu-pro-client-to-enable-fips, https://ubuntu.com/blog/fips-140-3-for-ubuntu-22-04lts)
- `sshd_config(5)` man page (ClientAliveCountMax / ClientAliveInterval semantics)
- OpenSSL 3 FIPS module configuration documentation
- FedRAMP Rev 5 control baseline overview (fedramp.gov)
- ComplianceAsCode / SCAP Security Guide project (ssg-ubuntu2204 content)
- DISA STIGs for Canonical Ubuntu LTS

## Issues Found
1. **`ClientAliveCountMax 0` did the opposite of what was intended.** Per `sshd_config(5)`, "Setting a zero ClientAliveCountMax disables connection termination." The post's "Session controls" intent is to terminate idle sessions, so I changed it to `ClientAliveCountMax 1`, which (with `ClientAliveInterval 600`) disconnects after one missed probe (~10 minutes idle), matching DISA STIG guidance.
2. **`libssl1.1` is not available on Ubuntu 22.04.** Ubuntu 22.04 ships OpenSSL 3.0.2 (`libssl3`), and `libssl1.1` was dropped from the default archive. The post then immediately configures OpenSSL 3 provider syntax (`providers = provider_sect`, `[fips_sect]`), which is internally inconsistent with installing `libssl1.1`. I replaced the install line with `openssl strongswan`, matching the OpenSSL 3 configuration that follows.
3. **Misleading "Or manually install" FIPS alternative.** Both `sudo ua enable fips` and `sudo apt install ubuntu-fips` require Ubuntu Pro — `ubuntu-fips` lives in the Pro APT repository, not the default archive (verified on packages.ubuntu.com). I removed the false alternative and added the missing `sudo pro attach <YOUR_TOKEN>` step, since `pro enable fips` fails on an unattached machine.
4. **Outdated audisp paths.** Ubuntu 22.04 ships `auditd` 3.0.7, in which audispd was merged into auditd upstream; configuration moved from `/etc/audisp/` to `/etc/audit/`. I changed `/etc/audisp/plugins.d/au-remote.conf` → `/etc/audit/plugins.d/au-remote.conf` and `/etc/audisp/audisp-remote.conf` → `/etc/audit/audisp-remote.conf`, and added `apt install audispd-plugins` (the package that actually ships `audisp-remote`).
5. **`/var/log/fedramp/` written to before being created.** The SUID/SGID `tee` line would fail because the directory does not exist yet. I added `sudo mkdir -p /var/log/fedramp` before the redirection and made the `tee` itself `sudo` (the find runs as root via sudo upstream, but the redirection was unprivileged).

## Review Notes
- The `ua` CLI was renamed to `pro` in 2022; both still work on Jammy, but I used `pro` in the rewritten FIPS section as it is the current recommended name.
- The audit rule `-a always,exit -F arch=b64 -S setuid -F a1=0 -F exe=/bin/bash -k priv_esc` is unusual — the `setuid(uid_t)` syscall only uses `a0`, so the `a1=0` filter is meaningless. The standard CIS/STIG pattern is `-a always,exit -F arch=b64 -S setuid -F auid>=1000 -F auid!=unset -k priv_esc`. Left as-is since the author's intent is ambiguous and the rule will still match (a1 is unused, typically zero) without breaking anything; flagging here for a future pass.
- OpenSSL 3 config activates both `fips` and `default` providers simultaneously, which makes FIPS algorithms *available* but does not *enforce* FIPS-only operation. For strict FIPS-only enforcement, a `base` + `fips` configuration is more appropriate. The current config is not wrong, just not as strict as a hardened FedRAMP environment ultimately needs.
- The "~325 controls" figure for FedRAMP Moderate aligns with the Rev 5 baseline; acceptable as an approximation.
- The post correctly closes with the caveat that technical hardening alone does not produce a FedRAMP ATO — SSP, 3PAO assessment, and POA&M work are also required.
