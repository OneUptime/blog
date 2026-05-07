# Validation Summary: How to Automate Network Device Backups with Netmiko and Cron

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Netmiko
- Cron / crontab
- Cisco IOS / IOS XE CLI privilege levels
- Linux filesystem paths and symlinks

## Sources Consulted
- Netmiko API documentation: https://ktbyers.github.io/netmiko/docs/netmiko/
- Netmiko Cisco IOS API documentation: https://ktbyers.github.io/netmiko/docs/netmiko/cisco/cisco_ios.html
- Netmiko BaseConnection API documentation: https://ktbyers.github.io/netmiko/docs/netmiko/base_connection.html
- Python `pathlib` documentation: https://docs.python.org/3/library/pathlib.html
- Cisco: Configure Full Running Config for Users with Low Privilege Levels: https://www.cisco.com/c/en/us/support/docs/routers/asr-1000-series-aggregation-services-routers/212149-Configure-IOS-XE-to-display-full-show-ru.html
- Cisco IOS XE command reference for `show running-config`: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-2/command_reference/b_172_9500_cr/system_management_commands.pdf
- Cisco IOS XE security guide for privilege levels and viewing running config: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_cfg/configuration/xe-3e/sec-cfg-sec-4cli.html
- `crontab(5)` manual page: https://man7.org/linux/man-pages/man5/crontab.5.html
- `crontab(1)` manual page: https://man7.org/linux/man-pages/man1/crontab.1.html
- GNU Diffutils manual: https://www.gnu.org/software/diffutils/manual/diffutils.html
- GNU Bash filename expansion reference: https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html

## Issues Found
- The post originally used `show running-config` for a low-privilege Cisco backup user. Cisco documents that this can return an abbreviated config; I updated the script and device CLI example to use `show running-config view full` so the backup captures the full running configuration.
- The device privilege example was incomplete for this use case. I added `file privilege 5`, which Cisco notes may also be required on IOS XE platforms when exposing full running-config access to lower-privilege users.
- The script always called `conn.enable()` while the post also recommended a read-only privilege-based backup user. I changed the code so enable mode is only entered when an `enable_password` is supplied, and I removed `enable_password` from the sample inventory to match the documented read-only workflow.
- The cron instructions used `crontab -e` for the current user even though the example paths write to `/usr/local/bin`, `/etc`, `/var/backups`, and `/var/log`. Since `crontab` entries run as the crontab owner, I updated the example to use root's crontab via `sudo`.
- The backup comparison example used shell globs with `diff`. Because Bash expands globs into filename lists and `diff` compares two files, that example could fail if multiple backups existed for one day. I replaced it with an explicit two-file diff example and added a command to list the newest timestamped backups first.
- The description overstated the scope as Cisco plus other devices, but the commands shown are Cisco IOS / IOS XE specific. I narrowed the wording to match the actual implementation.

## Review Notes
- The post now reads as a Cisco IOS / IOS XE tutorial. Readers targeting non-Cisco devices will need a different Netmiko `device_type` and the vendor-specific command used to retrieve configuration.
- The Python example compiled successfully after the corrections.
- The post still assumes `netmiko` and `PyYAML` are already installed on the host. That is acceptable, but adding an install prerequisite in a future revision would make the guide easier to follow end-to-end.
