# Validation Summary: How to Create Ansible Roles for NTP Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Chrony
- NTP
- Linux systemd services
- Debian/Ubuntu package conventions
- Red Hat Enterprise Linux package conventions

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Chrony `chrony.conf(5)` documentation: https://chrony-project.org/doc/4.6/chrony.conf.html
- Chrony `chronyc(1)` documentation: https://chrony-project.org/doc/4.2/chronyc.html
- Red Hat Enterprise Linux Chrony documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_time_synchronization/using-chrony
- Ubuntu Server Chrony documentation: https://documentation.ubuntu.com/server/how-to/networking/chrony-client/
- Debian Chrony package source files: https://sources.debian.org/src/chrony/

## Issues Found
- The role used `chronyd` as the default service name for all systems. Debian and Ubuntu package Chrony as `chrony.service`, while Red Hat uses `chronyd.service`. Updated `ntp_service` to select the correct service name by `ansible_os_family`.
- The role used `/etc/chrony/chrony.conf` for all systems. Red Hat documents `/etc/chrony.conf`. Updated `ntp_config_file` to select the correct path by OS family.
- The role hard-coded `_chrony` as the log directory owner and group. That matches Debian-family packaging but not Red Hat, which uses `chrony`. Added `ntp_user` and `ntp_group` defaults and used them in the file task.
- The role used Debian-style key file paths with a Red Hat-compatible drift file path. Updated `ntp_keyfile` and `ntp_driftfile` to use Debian-family and Red Hat-family defaults.
- The Red Hat installation task used `ansible.builtin.yum`. Updated it to `ansible.builtin.dnf`, which is the current package module for modern RPM-based distributions.
- The Chrony template always emitted `local stratum 10`, which makes a host serve local time even when it is not synchronized. Updated the template to emit `local stratum` only when `ntp_local_stratum` is explicitly set.
- The `chronyc waitsync` command passed `0` as the fourth argument. Chrony documents the fourth argument as the retry interval, so the example now omits it and uses `chronyc waitsync 10 {{ ntp_max_offset_warning }}`.

## Review Notes
The monitoring example is syntactically valid, but in a production monitoring system it would be better to account for missing `System time` output before calling `first`, and to alert on Chrony's synchronization state as well as the reported offset.
