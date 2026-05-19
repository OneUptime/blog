# Validation Summary: How to Clean Up APT Cache and Old Packages on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT and apt-get
- dpkg and dpkg-query
- apt-mark
- deborphan and orphaner
- unattended-upgrades
- APT periodic systemd jobs
- cron
- GRUB kernel boot configuration

## Sources Consulted
- Ubuntu apt-get man page: https://manpages.ubuntu.com/manpages/noble/en/man8/apt-get.8.html
- Ubuntu apt-mark man page: https://manpages.ubuntu.com/manpages/noble/man8/apt-mark.8.html
- Ubuntu apt man page: https://manpages.ubuntu.com/manpages/noble/man8/apt.8.html
- Ubuntu Server documentation, Automatic updates: https://ubuntu.com/server/docs/how-to/software/automatic-updates/
- Ubuntu Community Help Wiki, RemoveOldKernels: https://help.ubuntu.com/community/RemoveOldKernels
- Debian deborphan man page: https://manpages.debian.org/bookworm/deborphan/deborphan.1.en.html
- Local system man pages and installed configuration for apt-get, apt, apt-mark, dpkg-query, unattended-upgrade, /etc/apt/apt.conf.d/50unattended-upgrades, and /usr/lib/apt/apt.systemd.daily

## Issues Found
- The introduction said APT caches every package it downloads and keeps those files until explicitly cleared. Modern Ubuntu's `apt` frontend commonly has `Binary::apt::APT::Keep-Downloaded-Packages "0"`, so downloaded `.deb` files may be removed after successful installation. Updated the wording to describe cache behavior as configuration- and command-dependent.
- The `apt autoclean` comment said it keeps the latest version of each installed package's `.deb`. The apt-get man page defines `autoclean` as removing package files that can no longer be downloaded. Updated the comment to match that behavior.
- The `apt-mark showauto` example said it showed auto-installed packages that are no longer needed. The apt-mark man page says it lists all automatically installed packages, not only removable ones. Updated the comment.
- The `deborphan` explanation said it finds packages with no dependencies and no reverse dependencies. The deborphan man page says it finds packages with no packages depending on them, and its default search is limited to selected sections such as libs, oldlibs, and introspection. Updated the comment.
- The deborphan and `apt purge` command-substitution examples could fail noisily when no packages were returned. Replaced them with `xargs -r` pipelines.
- The kernel package listing stripped only `-generic` from the running kernel name. Updated it to strip the final flavor suffix so it works better across Ubuntu kernel flavors.
- The current-kernel comment said the running kernel will never be autoremoved. Reworded it to the operationally correct instruction: do not remove packages for the running kernel.
- The automatic cleanup section called the APT periodic configuration a timer and a script. Updated the wording to describe it as APT periodic configuration run by APT's periodic systemd jobs.

## Review Notes
The commands are generally correct for current Ubuntu releases. Future improvements could add dry-run examples such as `apt -s autoremove --purge` before removal steps, but that is a safety enhancement rather than a correctness fix.
