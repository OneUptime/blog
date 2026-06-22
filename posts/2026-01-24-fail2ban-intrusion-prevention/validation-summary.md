# Validation Summary: How to Configure fail2ban for Intrusion Prevention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- fail2ban
- Linux system administration
- systemd services and journal backends
- iptables and nftables firewall actions
- SSH, Apache, Nginx, Postfix, MySQL/MariaDB
- Shell commands and fail2ban configuration files

## Sources Consulted
- fail2ban upstream `jail.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- fail2ban upstream `fail2ban.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/fail2ban.conf
- fail2ban upstream README: https://github.com/fail2ban/fail2ban/blob/master/README.md
- fail2ban manpages from Ubuntu package `fail2ban` 1.0.2-3ubuntu0.1: `jail.conf(5)`, `fail2ban-client(1)`, and `fail2ban-regex(1)`
- Ubuntu package metadata for `fail2ban` 1.0.2-3ubuntu0.1
- Packaged fail2ban filters/actions from Ubuntu `fail2ban` 1.0.2-3ubuntu0.1, including `sshd.conf`, `nginx-limit-req.conf`, and `recidive.conf`

## Issues Found
- The configuration tree only mentioned `jail.d/*.conf`; updated it to include `.local` drop-ins and clarified that package-provided `.conf` files should not be edited directly.
- The post stated iptables was the default ban action. Current Debian/Ubuntu packaging can default to nftables via `jail.d/defaults-debian.conf`, so the example now uses `nftables-multiport` and describes choosing the system firewall backend.
- The SSH examples hard-coded `/var/log/auth.log` and omitted the packaged SSH backend macro. Updated them to use `%(sshd_log)s` and `%(sshd_backend)s`.
- The enhanced SSH jail used `filter = sshd` with `mode = aggressive`, which can fail to pass the mode explicitly. Updated it to `filter = sshd[mode=%(mode)s]`.
- The `sshd-ddos` jail referenced a non-existent `sshd-ddos` filter in current fail2ban packaging. Updated it to use `filter = sshd[mode=ddos]`.
- The custom SSH filter was created as a new `.local` filter and was not wired to a jail. Changed it to a new custom `sshd-strict.conf` filter and added the required `filter = sshd-strict` usage note.
- The Nginx bot-search jail used the access log, but the packaged jail uses the Nginx error log. Updated the log path.
- The Nginx rate-limit section overwrote a packaged `.conf` filter with a simplified regex. Changed it to extend the packaged filter through `nginx-limit-req.local`.
- Postfix and MySQL examples hard-coded distro-specific log paths and redundant filters. Updated them to use fail2ban's packaged log/backend macros and the correct Postfix auth filter mode.
- The recidive jail used `action_mwl` and did not mention the database retention requirement. Updated it to use the all-ports ban action and added a `dbpurgeage` note.
- The persistent database settings were shown under `jail.local [DEFAULT]`, but `dbfile` and `dbpurgeage` belong in `fail2ban.local [Definition]`. Corrected the snippet.
- The high-resource section used unsupported `polltime`. Replaced it with valid backend guidance.
- The custom action example created a new action as `notify.local`; changed it to `notify.conf` because it is a new site-defined action, not an override of a packaged action.

## Review Notes
The post is technically relevant and accurate after the corrections. Some examples remain distribution-sensitive because fail2ban paths and defaults vary by package; the updated snippets prefer fail2ban's packaged macros where available to reduce that risk.
