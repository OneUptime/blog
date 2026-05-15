# Validation Summary: How to Set Up Disk Space Alerts with RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL System Roles
- Ansible
- Performance Co-Pilot (PCP)
- pmie
- pmrep
- systemd timers
- Linux shell scripting and syslog

## Sources Consulted
- Red Hat RHEL 9 documentation: Managing local storage by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/managing-local-storage-using-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat RHEL System Roles collection page: https://catalog.redhat.com/software/collection/redhat/rhel_system_roles
- Red Hat RHEL 9 metrics System Role documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/monitoring-performance-by-using-the-metrics-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Performance Co-Pilot User's and Administrator's Guide: https://pcp-docs.readthedocs.io/en/latest/pcp-users-and-administrators-guide.html
- Performance Co-Pilot quick guide for pmie rules: https://pcp.readthedocs.io/en/latest/QG/SetupAutomatedRules.html
- PCP project installation notes for Fedora/RHEL services: https://pcp.io/download.html

## Issues Found
- The playbook examples used legacy role names (`rhel-system-roles.metrics` and `rhel-system-roles.storage`). Updated them to the documented collection role names (`redhat.rhel_system_roles.metrics` and `redhat.rhel_system_roles.storage`) for RHEL 9.
- The storage role example omitted `type: lvm` in `storage_pools`. Added it so the pool definition is explicit and matches Red Hat's documented storage role examples.
- The custom shell script set `MAILTO` but never used it, and its `logger` calls did not set the `check_disk_space` tag used by the later `journalctl -t check_disk_space` command. Removed the unused variable and added `logger -t check_disk_space`.
- The PCP `pmie` alert example wrote a standalone file under `/etc/pcp/pmie/config.d/`, but the documented default managed configuration is `/var/lib/pcp/config/pmie/config.default`. Changed the Ansible task to use `blockinfile` against that file.
- The original `pmie` rule syntax used `filesys.full $1 > 85`, which is not valid for evaluating all filesystem instances as a singular rule expression. Updated the rules to use `some_inst (...)` and named rule assignments, matching PCP's documented pmie rule syntax.
- The original warning and critical `pmie` rules would both fire at 95% usage. Updated the warning rule to apply from greater than 85% and less than 95%, and the critical rule to apply at 95% or higher.

## Review Notes
Static validation was completed against official documentation. I could not run `ansible-playbook --syntax-check` locally because `ansible-playbook` is not installed in this workspace.
