# Validation Summary: How to Audit Ubuntu Servers with Lynis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Linux
- Lynis
- OpenSSH server configuration
- Linux sysctl kernel parameters
- UFW
- PAM password quality configuration
- unattended-upgrades
- cron and systemd timers
- Prometheus textfile metrics

## Sources Consulted
- CISOfy Lynis documentation: https://cisofy.com/documentation/lynis/
- CISOfy Lynis get started guide: https://cisofy.com/documentation/lynis/get-started/
- CISOfy community package repository documentation: https://packages.cisofy.com/community/
- CISOfy Lynis upstream source and default profile: https://github.com/CISOfy/lynis
- OpenSSH release notes: https://www.openssh.com/releasenotes.html
- Ubuntu / Linux login.defs manual: https://man7.org/linux/man-pages/man5/login.defs.5.html
- Local Ubuntu 24.04 command/man-page checks for `sshd_config`, `systemctl`, and current Lynis command/profile parsing from upstream Lynis 3.1.6.

## Issues Found
- The hardening analysis script counted `test_result[]=OK` and `test_result[]=WARNING` fields that are not emitted by current Lynis reports. Replaced those counters with supported `warning[]` and `suggestion[]` report fields, and changed the framework display to the documented `installed_packages` field used elsewhere in the post.
- The SSH hardening snippet included `Protocol 2`. Modern OpenSSH removed SSH protocol 1 support and the related configuration option, so this line is obsolete and no longer documented. Removed the option from the example.
- The password aging example started a here-document for `/etc/login.defs.d/password-policy.conf` but never closed it, which made the shell snippet invalid. Replaced it with direct `sed` updates to `/etc/login.defs` and clarified that those settings apply to newly created accounts.
- The custom Lynis profile examples used deprecated `config:key:value` profile syntax and unsupported `test-group=` profile entries. Converted profile keys to current `key=value` form, removed invalid profile test-group entries, and showed `--tests-from-group ssh` as a command-line filter where appropriate.
- The CIS-focused profile used deprecated or invalid options (`config:compressed_uploads:no`, `config:test_skip_always:no`). Replaced with the current `compressed-uploads=no` setting and removed the invalid no-op entry.

## Review Notes
- Lynis compliance profile settings are accepted by the current profile parser, but deeper compliance reporting may require Lynis Enterprise plugins depending on the desired standard and reporting workflow.
- `PASS_MAX_DAYS`, `PASS_MIN_DAYS`, and `PASS_WARN_AGE` in `/etc/login.defs` affect defaults for newly created accounts; existing accounts need separate `chage` updates if policy must be applied retroactively.
- The corrected bash code blocks pass `bash -n`, and the corrected Lynis profile examples parse successfully with current upstream Lynis.
