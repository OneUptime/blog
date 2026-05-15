# Validation Summary: How to Automate Journald Configuration Using RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL System Roles
- Ansible
- systemd-journald
- rsyslog
- firewalld
- SELinux audit troubleshooting

## Sources Consulted
- Red Hat documentation: Configuring the systemd journal by using RHEL system roles - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-the-systemd-journal-by-using-the-journald-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat documentation: Preparing a control node and managed nodes to use RHEL system roles - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/assembly_preparing-a-control-node-and-managed-nodes-to-use-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat documentation: Configuring logging by using RHEL system roles - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-logging-by-using-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- systemd journald.conf manual - https://www.freedesktop.org/software/systemd/man/249/journald.conf.html
- firewalld firewall-cmd manual - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld open port documentation - https://firewalld.org/documentation/howto/open-a-port-or-service

## Issues Found
- The package installation command installed `rsyslog` and `systemd`, but the post is about RHEL System Roles automation. Changed it to install `rhel-system-roles`, which Red Hat documents as installing the RHEL System Roles collection and `ansible-core` dependency on a RHEL control node.
- The prerequisites described a single RHEL host with root or sudo access, but RHEL System Roles use an Ansible control node and managed nodes. Updated the prerequisites to reflect a RHEL 9 control node and managed systems with SSH and sudo access.
- The configuration step incorrectly instructed readers to manually edit `/etc/systemd/journald.conf` and rsyslog files. Replaced this with a documented `redhat.rhel_system_roles.journald` playbook using `journald_persistent`, `journald_max_disk_size`, `journald_per_user`, and `journald_sync_interval`.
- The run commands restarted local services manually. Replaced them with `ansible-playbook --syntax-check ~/playbook.yml` and `ansible-playbook ~/playbook.yml`, matching the RHEL System Roles workflow.
- The firewall step implied port 514/tcp was universally required for remote logging. Clarified that it applies when receiving remote syslog traffic over TCP.

## Review Notes
The remaining rsyslog verification and troubleshooting commands are technically valid for systems that use rsyslog-backed `/var/log/messages`, but they are adjacent to journald automation rather than part of the `journald` role itself.
