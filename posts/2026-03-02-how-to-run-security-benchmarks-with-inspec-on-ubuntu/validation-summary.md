# Validation Summary: How to Run Security Benchmarks with InSpec on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Chef InSpec (compliance-as-code framework)
- Ubuntu 22.04 / 24.04
- Ruby DSL (for InSpec controls)
- CIS Benchmarks / DISA STIGs
- dev-sec community profiles (linux-baseline, cis-dil-benchmark)
- SSH / sshd_config
- chrony / auditd / pwquality
- GitLab CI (for CI/CD integration example)
- Docker (as an InSpec target)

## Sources Consulted
- Chef InSpec CLI documentation: https://docs.chef.io/inspec/cli/
- Chef InSpec shell documentation: https://docs.chef.io/inspec/7.0/shell/
- Chef license documentation: https://docs.chef.io/inspec/6.8/install/license/
- Chef package distribution: https://docs.chef.io/packages/
- inspec.yml profile reference: https://docs.chef.io/inspec/profiles/inspec_yml/
- InSpec profile controls: https://docs.chef.io/inspec/7.0/profiles/controls/
- InSpec GitHub releases: https://github.com/inspec/inspec/releases
- dev-sec/linux-baseline: https://github.com/dev-sec/linux-baseline
- dev-sec/cis-dil-benchmark: https://github.com/dev-sec/cis-dil-benchmark

## Issues Found

1. **Incorrect CLI flag for inline checks (`inspec exec -e`)**: The `inspec exec` subcommand does not accept a `-e` flag for inline expressions. The correct command for running a one-off inline check is `inspec shell -c '<expression>'`. Fixed both example commands in the "Running Your First Check" section to use `inspec shell -c`.

2. **Non-existent GitHub repository URL**: The post referenced `https://github.com/nicholasfountain/cis-ubuntu-22.04-level1-hardening`, which does not exist (404). Replaced with `https://github.com/dev-sec/cis-dil-benchmark`, which is the well-known dev-sec CIS Distribution Independent Linux Benchmark profile. Also corrected the misleading comment that called the dev-sec/linux-baseline a "CIS Ubuntu 22.04 L1 benchmark profile from Chef Supermarket" — it is a general Linux hardening profile hosted on GitHub.

3. **Ruby syntax error in control `pkg-001`**: The package list was written as `%w[telnet rsh-client talk).each` with a mismatched closing `)` instead of `]`. This is invalid Ruby and would have failed to parse. Fixed to `%w[telnet rsh-client talk].each`.

## Review Notes

- The post pins `INSPEC_VERSION="6.6.0"`. As of the review date (2026-05-19), the InSpec 6 series latest is around 6.8.24 and InSpec 7.x is the current major release. However, the post explicitly tells readers to check the downloads page for the latest version, so the pinned constant is acceptable as a working example. No change made.
- The `--chef-license accept` flag form is correct and is accepted by `inspec exec`. The `CHEF_LICENSE=accept` environment variable is an alternative that could be mentioned but is not required.
- The `tag "CIS": ["2.1.1"]` hash-style syntax inside controls is valid Ruby and accepted by InSpec.
- The `supports:` block in `inspec.yml` using `platform-name` and `release` keys is correct per the official profile reference.
- The omnitruck install script (`https://omnitruck.chef.io/install.sh ... -P inspec`) is the officially documented one-line install method.
- The Chef package URL pattern (`packages.chef.io/files/stable/inspec/...`) is the documented stable channel URL pattern.
- The GitLab CI example uses `image: chef/inspec:6` — this image tag exists, though readers should verify the exact tag they want against the chef/inspec Docker Hub repo.
- The sample output in "Understanding the Output" matches InSpec's CLI reporter format closely enough to be illustrative.
