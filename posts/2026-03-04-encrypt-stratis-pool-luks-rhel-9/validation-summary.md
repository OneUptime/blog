# Validation Summary: How to Encrypt a Stratis Pool Using LUKS on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis
- LUKS2
- Linux kernel keyring
- Clevis, Tang, and NBDE
- TPM 2.0
- systemd fstab dependencies

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: Setting up Stratis file systems, including encrypted pools, NBDE/TPM binding, unlocking, mounting, fstab setup, adding block devices, and monitoring: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- stratis(8) CLI manual page for current command syntax, key handling, encryption binding, rebind, start, and add-data behavior: https://www.mankier.com/8/stratis
- Stratis project release notes for encryption binding and keyring behavior: https://stratis-storage.github.io/stratis-release-notes-3-8-0/

## Issues Found
- The `/etc/fstab` example used a generic filesystem UUID with `x-systemd.requires=stratisd.service`. Red Hat's RHEL 9 Stratis documentation uses the `/dev/stratis/pool/filesystem` path and the `stratis-fstab-setup@pool-uuid.service` dependency. Updated the command and preceding text to use the documented pool UUID dependency.
- The key file subsection implied that creating a random key file after pool creation configured automatic unlocking. A local key file only supports noninteractive key loading unless additional boot-time automation is configured, and it must match the key used for the pool. Reworded the subsection and replaced the incomplete `dd` example with `stratis key set --keyfile-path`.
- The NBDE bind command included an extra key description argument and placed the Tang URL after it. Updated the command to the RHEL 9 documented form: `stratis pool bind nbde --trust-url encrypted_pool http://tang-server:port`.
- The TPM bind command used `tpm2` and an extra key description argument. Updated it to the RHEL 9 documented form: `stratis pool bind tpm encrypted_pool`.
- The manual unlock troubleshooting command used `stratis pool unlock keyring`, which is not the RHEL 9 documented command in the current Stratis workflow. Updated it to `stratis pool start --unlock-method keyring --name encrypted_pool`.

## Review Notes
- The post is technically relevant and code-heavy, so it was fully reviewed rather than marked as non-code content.
- The local environment did not have `stratis` installed, so command validation was performed against official Red Hat RHEL 9 documentation and the published `stratis(8)` manual page.
- Current upstream Stratis CLI documentation also exposes newer `pool encryption bind ...` command forms and marks some older bind/rebind paths as moved/deprecated in future Stratis releases. The post targets RHEL 9, so the fixes use the RHEL 9 documented syntax.
