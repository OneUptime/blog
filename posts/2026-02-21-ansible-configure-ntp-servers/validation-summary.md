# Validation Summary: How to Use Ansible to Configure NTP Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- chrony
- ntpd
- NTP
- systemd timedatectl
- Linux service management
- firewalld
- Jinja2 templates

## Sources Consulted
- Ansible ansible.builtin.package module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible ansible.builtin.service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible ansible.builtin.template module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.command module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible community.general.timezone module: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.posix.firewalld module: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- chrony chrony.conf manual: https://chrony-project.org/doc/4.6/chrony.conf.html
- chrony chronyc manual: https://chrony-project.org/doc/4.2/chronyc.html
- NTP ntp.conf manual: https://www.ntp.org/documentation/4.2.8-series/ntp.conf/
- systemd timedatectl manual: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- Ubuntu time synchronization documentation: https://documentation.ubuntu.com/server/explanation/networking/about-time-synchronisation/
- Ubuntu chrony documentation: https://documentation.ubuntu.com/server/how-to/networking/chrony-client/
- Red Hat Enterprise Linux 8 time synchronization documentation: https://docs.redhat.com/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings

## Issues Found
- The post stated that Ubuntu 18.04+ defaults to chrony. Ubuntu documentation says systemd-timesyncd was the default through Ubuntu 25.04, with chrony becoming the default in Ubuntu 25.10. Updated the distribution claim accordingly.
- The chrony playbooks used the RHEL/Fedora service name `chronyd` and configuration path `/etc/chrony.conf` for all Linux hosts. Debian and Ubuntu use the `chrony` service and `/etc/chrony/chrony.conf`. Added `chrony_service_name` and `chrony_config_path` variables to make the examples work across those families.
- The internal NTP playbook configured and started chrony without first installing the package. Added an installation task consistent with the other chrony examples.
- The verification task named "Fail if clock offset is too large" had `ignore_errors: true`, which would suppress the failure. Replaced that with a condition that skips the check only when chrony tracking is unavailable.
- The NTP hierarchy diagram labeled `pool.ntp.org` as Stratum 1. Public pool servers are not guaranteed to be Stratum 1. Changed the diagram label to "Public NTP Servers".

## Review Notes
The Ansible modules, chrony directives, ntpd configuration directives, `chronyc` commands, `timedatectl` commands, and firewalld module usage are valid against the consulted documentation. The examples still assume package/service names typical of Debian-family and Red Hat-family distributions; other Linux families may need inventory variables for their local chrony packaging conventions.
