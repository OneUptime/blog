# Validation Summary: How to Set Up Automatic Security Updates on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- unattended-upgrades
- APT periodic updates and systemd timers
- Canonical Livepatch
- Ubuntu Pro Client
- Postfix SMTP relay configuration
- Bash monitoring and notification scripts
- cron

## Sources Consulted
- Ubuntu Server documentation: Automatic updates - https://ubuntu.com/server/docs/how-to/software/automatic-updates/
- unattended-upgrades upstream README - https://github.com/mvo5/unattended-upgrades/blob/master/README.md
- unattended-upgrades Ubuntu default configuration - https://github.com/mvo5/unattended-upgrades/blob/master/data/50unattended-upgrades.Ubuntu
- Ubuntu Pro Client documentation: How to manage Livepatch - https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_livepatch/
- Canonical Livepatch product page - https://ubuntu.com/security/livepatch
- Livepatch client configuration options - https://discourse.ubuntu.com/t/livepatch-client-configuration-options/63410
- Postfix configuration parameters - https://www.postfix.org/postconf.5.html
- Postfix SASL README - https://www.postfix.org/SASL_README.html

## Issues Found
- The introduction and conclusion overstated Livepatch by implying kernel security updates do not require reboots at all. Updated wording to say Livepatch applies critical kernel security patches and reduces the need for immediate reboots.
- The `20auto-upgrades` explanation said `dpkg-reconfigure` creates the file. Updated it to "creates or updates" because the file may already exist on Ubuntu systems.
- The Allowed Origins comment described `${distro_id}:${distro_codename}` as security updates for the base system. Updated it to describe the base release pocket more accurately.
- The Postfix example used `smtp_use_tls`, which Postfix documents as obsolete when `smtp_tls_security_level` is set. Replaced it with `smtp_tls_security_level = encrypt`.
- The cron examples installed jobs into the current user's crontab even though the scripts read privileged logs and write under `/var/log`. Updated both examples to use root's crontab via `sudo crontab`.
- The Ubuntu Pro section referenced `ubuntu-advantage-tools` and the `ubuntu-advantage` tool as the primary path. Updated it to use the current `ubuntu-pro-client` package and `pro` tool, while leaving `ua` as older syntax where available.
- The Livepatch enablement text implied `sudo pro enable livepatch` is always required after attaching. Updated it to note that Livepatch is usually enabled automatically for Ubuntu LTS after attaching Ubuntu Pro, and manual enablement is only needed if disabled.
- The Livepatch configuration section incorrectly described `check-interval` as seconds and used `3600`. Corrected it to minutes and used the documented minimum of `60`.
- The Livepatch configuration section used undocumented `auto-refresh=true`. Replaced it with the documented `check-interval=0` method for disabling automatic checks.

## Review Notes
The troubleshooting section includes forceful lock-removal commands with cautionary comments. They are common emergency recovery commands, but future revisions could recommend waiting for active APT/dpkg processes and using less forceful recovery steps before removing lock files.
