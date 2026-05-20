# Validation Summary: How to Enable Ubuntu Pro Features on Your Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Ubuntu Pro Client
- Expanded Security Maintenance (ESM)
- Canonical Livepatch
- FIPS and FIPS Updates
- Ubuntu Security Guide (USG)
- CIS Benchmarks
- Real-time Ubuntu kernel
- cloud-init
- systemd

## Sources Consulted
- Ubuntu Pro Client CLI reference: https://documentation.ubuntu.com/pro-client/en/latest/references/commands/
- Ubuntu Pro Client FIPS guide: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_fips/
- Ubuntu Pro Client CIS/USG guide: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_cis/
- Ubuntu Security Guide documentation: https://documentation.ubuntu.com/security/compliance/usg/
- Ubuntu Security Guide CIS profile documentation: https://documentation.ubuntu.com/security/compliance/usg/cis-benchmarks/
- Ubuntu Security Guide CIS audit/fix/customization documentation: https://documentation.ubuntu.com/security/compliance/usg/cis-audit/
- Ubuntu Livepatch status documentation: https://ubuntu.com/security/livepatch/docs/livepatch/how-to/status
- Ubuntu Pro Client real-time kernel documentation: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_realtime_kernel/
- cloud-init Ubuntu Pro module reference: https://docs.cloud-init.io/en/latest/reference/modules.html#ubuntu-pro
- Ubuntu Pro daemon documentation: https://documentation.ubuntu.com/pro-client/en/latest/explanations/what_is_the_daemon/

## Issues Found
- The ESM source-file examples used hard-coded `.list` filenames. Current Ubuntu releases may use deb822 `.sources` files, so the examples now use an `*esm*` glob under `/etc/apt/sources.list.d/`.
- The FIPS enablement example used `pro enable fips --dry-run`, but `pro enable` does not support `--dry-run`. The section now enables `fips-updates`, which Canonical recommends and which is available on newer LTS releases where legacy `fips` is not.
- The FIPS updates explanation implied base `fips` is generally suitable for production. It now notes that legacy `fips` is unavailable on Ubuntu 22.04 LTS and later and that `fips-updates` is the recommended option.
- The USG examples included `usg audit --list` and `usg fix ... --dry-run`; these are not documented in the current official USG workflow, so they were removed.
- The USG tailoring examples used `--tailoring-file` with `generate-tailoring` and combined a profile argument with `fix --tailoring-file`. These were changed to the documented `generate-tailoring <profile> <file>` and `usg fix --tailoring-file <file>` forms.
- The Ubuntu Pro configuration example overwrote `/etc/ubuntu-advantage/uaclient.conf` directly. It now uses the documented `pro config show` and `pro config set` commands.
- The cloud-init example used the deprecated `ubuntu_advantage` key and included `esm-apps`, which is not in the current cloud-init module's supported service list. It now uses `ubuntu_pro` and keeps supported service names.

## Review Notes
The article is technically relevant and mostly aligned with Canonical's current documentation after the corrections above. Some examples remain release- and subscription-dependent, especially FIPS, Livepatch kernel coverage, and Real-time Ubuntu variants.
