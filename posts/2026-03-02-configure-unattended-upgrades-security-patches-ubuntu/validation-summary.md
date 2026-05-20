# Validation Summary: How to Configure Unattended Upgrades for Security Patches on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu Server
- unattended-upgrades
- APT periodic configuration
- systemd timers
- Ubuntu security update repositories
- Mail notifications and automatic reboot configuration

## Sources Consulted
- Ubuntu Server documentation: Automatic updates - https://ubuntu.com/server/docs/how-to/software/automatic-updates/
- Ubuntu Security documentation: Security updates - https://documentation.ubuntu.com/security/security-updates/
- Ubuntu manpage: unattended-upgrade(8) - https://manpages.ubuntu.com/manpages/noble/man8/unattended-upgrade.8.html
- Ubuntu manpage: systemd.timer(5) - https://manpages.ubuntu.com/manpages/noble/man5/systemd.timer.5.html
- Local Ubuntu package documentation: `/usr/share/doc/unattended-upgrades/README.md.gz`
- Local shipped configuration: `/etc/apt/apt.conf.d/50unattended-upgrades`
- Local shipped systemd units: `apt-daily.timer` and `apt-daily-upgrade.timer`

## Issues Found
- The post described `unattended-upgrades` as a daemon. The official manpage describes it as a program/backend run periodically by APT's systemd service or cron, so this was corrected to "tool."
- The post said `dpkg-reconfigure` sets up systemd timers. The timers are shipped systemd units; `dpkg-reconfigure unattended-upgrades` enables the APT periodic configuration consumed by those timers, so the wording was corrected.
- The `Allowed-Origins` examples omitted the base release pocket and described it as a general-update origin. Modern Ubuntu's default includes the base release pocket because security updates may need dependencies from it; the examples and summary were corrected while leaving `-updates` as the opt-in general stable update pocket.
- The email examples used legacy `Unattended-Upgrade::MailOnlyOnError`. Current unattended-upgrades documentation prefers `Unattended-Upgrade::MailReport` with values such as `"only-on-error"` and `"on-change"`, so the examples were updated.
- The systemd timer section claimed `apt-daily-upgrade` runs 6-8 minutes after boot and then at 6 AM. The shipped Ubuntu timers use calendar schedules with randomized delays and `Persistent=true`, so this was corrected to describe `apt-daily.timer` and `apt-daily-upgrade.timer` accurately.
- The timer override example cleared `OnBootSec`, but the shipped timer uses `OnCalendar`; the unnecessary `OnBootSec=` reset was removed.

## Review Notes
The remaining commands, configuration option names, reboot-required file paths, log paths, package blacklist/whitelist examples, and unattended-upgrade CLI flags were consistent with the Ubuntu documentation, local manpages, and shipped package configuration checked during review.
