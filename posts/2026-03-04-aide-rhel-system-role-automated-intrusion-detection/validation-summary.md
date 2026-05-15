# Validation Summary: How to Set Up the AIDE RHEL System Role for Automated Intrusion Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- AIDE
- Ansible
- Linux cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Checking integrity with AIDE, including the aide RHEL system role: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/checking-integrity-with-aide_security-hardening
- Red Hat Enterprise Linux 10 Security hardening: Configuring file integrity checks with the aide RHEL system role: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/security_hardening/checking-integrity-with-aide
- Linux System Roles aide role README: https://github.com/linux-system-roles/aide/blob/main/README.md
- Linux System Roles aide role defaults: https://github.com/linux-system-roles/aide/blob/main/defaults/main.yml
- Linux System Roles aide role tasks: https://github.com/linux-system-roles/aide/blob/main/tasks/main.yml
- AIDE man page for command behavior and exit status: https://manpages.debian.org/testing/aide-xen/aide.1.en.html

## Issues Found
- The post used non-existent or incorrect role variables: `aide_init_database`, `aide_conf_d_files`, a dictionary form of `aide_cron_check`, and `aide_email_notification`. Replaced them with documented variables: `aide_init`, `aide_config_template`, `aide_cron_check`, and `aide_cron_interval`.
- The basic playbook claimed to initialize the AIDE database but did not set `aide_init`; the role default is `false`. Added `aide_init: true`.
- The examples used inline configuration snippets, but the aide system role expects a complete custom `/etc/aide.conf` template through `aide_config_template`. Updated the examples and clarified that the custom template must be complete and include the role's required header comments.
- The per-host-group example described group variables while using play-level variables. Updated the wording to describe per-host-group templates accurately.
- The database archive task copied into `/var/lib/aide/archive` without ensuring that directory existed. Added a directory creation task.
- The fleet-wide check example said it saved reports locally but used `copy` without delegation, which would write on the managed host. Added local directory creation and delegated report writes to the control node.
- The force re-init command used the incorrect variable name `aide_init_database`. Updated it to `aide_init`.
- The cron verification command checked a user's crontab, but the role manages `/etc/crontab`. Updated it to search `/etc/crontab` for the AIDE check entry.

## Review Notes
The manual database update playbook is valid for direct AIDE management, but the aide system role also supports `aide_update` and `aide_fetch_db` for role-managed update workflows. Future revisions could show that role-native workflow instead of maintaining separate command tasks.
