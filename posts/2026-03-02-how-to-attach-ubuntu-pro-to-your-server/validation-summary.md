# Validation Summary: How to Attach Ubuntu Pro to Your Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Pro
- Ubuntu Pro Client (`pro`)
- Extended Security Maintenance (ESM)
- Livepatch
- FIPS
- Ubuntu Security Guide (USG)
- cloud-init
- Ansible
- Bash

## Sources Consulted
- Ubuntu Pro overview: https://ubuntu.com/pro
- Ubuntu Pro documentation: https://documentation.ubuntu.com/pro/
- Ubuntu Pro Client documentation: https://documentation.ubuntu.com/pro-client/
- Ubuntu Pro Client ESM guide: https://documentation.ubuntu.com/pro-client/en/v35/howtoguides/enable_esm_infra/
- Ubuntu Pro Client Livepatch guide: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/enable_livepatch/
- Ubuntu Pro Client CIS/USG guide: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_cis/
- Ubuntu Pro Client `pro fix` guide: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/fix_how_to_know_if_system_affected_by_cve/
- Ubuntu Pro Client proxy guide: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/configure_proxies/
- Ubuntu Pro Client network requirements: https://documentation.ubuntu.com/pro-client/en/v35/references/network_requirements/
- Ubuntu Pro Client status output explanation: https://documentation.ubuntu.com/pro-client/en/v32/explanations/status_columns/
- cloud-init Ubuntu Pro module reference: https://docs.cloud-init.io/en/latest/reference/modules.html
- Local `pro` CLI help output for version 37.1ubuntu0~24.04
- Local cloud-init schema validation

## Issues Found
- The post referred to `ubuntu-advantage-tools` as the current package for the `pro` command. Updated the section to use `ubuntu-pro-client`, which current Canonical docs use for the Pro client package.
- The attach behavior said only ESM-infra is enabled by default. Canonical docs state ESM-infra and ESM-apps are automatically enabled for Ubuntu LTS releases, with Livepatch also enabled by default on LTS. Updated the example output and explanation.
- The post listed `USGR` as a Pro feature. Replaced it with `pro fix`, which is the documented Ubuntu Pro Client mechanism for CVE/USN inspection and remediation.
- The cloud-init snippet used `ubuntu_advantage`, which cloud-init 24.1+ marks deprecated in favor of `ubuntu_pro`. Updated the key and changed the service list to the documented `esm` alias plus `livepatch`.
- The network troubleshooting section listed only two endpoints as required. Expanded the wording to "common endpoints include" and added documented endpoints for Livepatch, snap installation, and `pro fix`.
- The `pro fix` examples described listing CVEs/USNs but used commands that can apply fixes. Updated the examples to use `--dry-run` for preview/checking and kept `sudo pro fix` only for applying a specific fix.

## Review Notes
- The cloud-init snippet was validated locally with `cloud-init schema`.
- The Bash fleet-status script passed `bash -n` syntax validation. It uses `pro status --format json`, which Canonical documents as a machine-readable interface, though the local CLI labels JSON output experimental.
