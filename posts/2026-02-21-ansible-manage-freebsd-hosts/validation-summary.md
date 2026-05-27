# Validation Summary: How to Use Ansible to Manage FreeBSD Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- FreeBSD package management with pkg/pkgng
- FreeBSD rc.conf service configuration
- FreeBSD pf firewall configuration
- FreeBSD sysctl configuration
- Cron-based automation

## Sources Consulted
- Ansible documentation: Managing BSD hosts with Ansible, https://docs.ansible.com/projects/ansible/latest/os_guide/intro_bsd.html
- Ansible documentation: community.general.pkgng module, https://docs.ansible.com/projects/ansible/latest/collections/community/general/pkgng_module.html
- Ansible documentation: ansible.posix.sysctl module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible documentation: ansible.builtin.package module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible documentation: ansible.builtin.hostname module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible documentation: community.general.timezone module, https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation: community.general.ufw module, https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- FreeBSD Handbook: Using pkg for Binary Package Management, https://docs.freebsd.org/en/books/handbook/book/#pkgng-intro
- FreeBSD Handbook: Configuration, Services, Logging and Power Management, https://docs.freebsd.org/en/books/handbook/config/
- FreeBSD Handbook: PF firewall, https://docs.freebsd.org/en/books/handbook/firewalls/
- FreeBSD sysctl.conf(5) manual page, https://man.freebsd.org/sysctl.conf
- FreeBSD ports defaults: bsd.default-versions.mk, https://cgit.freebsd.org/ports/tree/Mk/bsd.default-versions.mk

## Issues Found
- Replaced the raw `pkg upgrade -y` task with `community.general.pkgng` using `name: "*"` and `state: latest`, matching the module's documented way to upgrade installed FreeBSD packages.
- Updated the FreeBSD pip package from `py39-pip` to `py311-pip` because the current FreeBSD ports default Python version is 3.11.
- Removed `on egress` from the pf examples and used portable pf rules that do not depend on an interface group being present.
- Changed the `ansible.posix.sysctl` task to use `reload: false`; the module documents reload as `/sbin/sysctl -p`, while FreeBSD processes `/etc/sysctl.conf` through its rc sysctl handling and uses FreeBSD-specific sysctl tooling.
- Replaced the Linux-oriented infrastructure example pieces: `ansible.builtin.package` became `community.general.pkgng`, `ansible.builtin.timezone` became `community.general.timezone`, hostname now specifies `use: freebsd`, the `/etc/hosts` line no longer uses Debian's `127.0.1.1` convention, and UFW was replaced with pf configuration.
- Updated the scheduled automation script to use `/bin/sh`, install under `/usr/local/sbin`, and run from cron as `root`, which is more appropriate for a FreeBSD host than relying on `/bin/bash`, `/opt/scripts`, or a pre-existing `ansible` user.
- Made the SSH hardening regexes in the common workflow match commented default directives as well as uncommented directives.

## Review Notes
The examples are now technically aligned with current Ansible and FreeBSD documentation. Some operational choices, such as exact pf policy, package set, and monitoring API details, remain environment-specific and should be adapted before use in production.
