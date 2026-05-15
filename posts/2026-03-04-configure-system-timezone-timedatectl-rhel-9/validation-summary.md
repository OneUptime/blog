# Validation Summary: How to Configure the System Timezone with timedatectl on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd timedatectl
- Linux timezone data and tzdata
- RTC / hardware clock configuration
- glibc timezone lookup
- systemd service environment overrides
- zdump
- Podman
- Ansible community.general.timezone

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring the date and time": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_changing-basic-environment-settings_configuring-basic-system-settings
- timedatectl(1) local man page and `timedatectl --help`
- tzset(3) local man page
- systemd.exec(5) local man page
- zdump local help output
- Podman run documentation for `--tz` and environment options: https://docs.podman.io/en/v3.4.1/markdown/podman-run.1.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html

## Issues Found
- The comment "Find timezones in the US" used `grep America`, which matches the Americas, not only US timezones. Changed the comment to "Find timezones in the Americas."
- The post stated that timezones follow the `Region/City` convention. Changed this to "Most timezones" because entries such as `UTC` do not follow that pattern.
- The Mermaid diagram used fixed abbreviations `ET` and `CET`, which can be inaccurate during daylight saving time. Changed those labels to "local time."
- The RTC check comment said "Check if the RTC is set to UTC" for a command that displays `RTC in local TZ`. Changed the comment to describe the actual output being checked.
- The manual date-setting section said users can set "just the date" without noting that `timedatectl set-time YYYY-MM-DD` sets the time to midnight. Added that caveat.
- The application timezone lookup section implied `/etc/timezone` is a fallback in the RHEL lookup path. Changed it to describe RHEL/glibc behavior as `TZ` then `/etc/localtime`, with `/etc/timezone` noted only as a configuration file used by some other distributions.
- The Podman section omitted Podman's native `--tz` option and implied host timezone inheritance as a default on some runtimes. Updated the wording and examples to include `--tz=America/New_York`, `--tz=local`, `TZ`, and the `/etc/localtime` bind mount.

## Review Notes
- The core `timedatectl` commands, RHEL 9 date/time examples, `tzdata` package references, systemd `Environment="TZ=..."` snippet, `zdump` usage, and Ansible module example are technically valid.
- The Ansible `community.general.timezone` module is not part of `ansible-core`; environments using only ansible-core must install the `community.general` collection.
