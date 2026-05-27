# Validation Summary: How to Use Ansible to Manage OpenBSD Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- OpenBSD
- OpenBSD packages with pkg_add / community.general.openbsd_pkg
- OpenBSD rcctl service management
- doas privilege escalation
- pf firewall configuration
- OpenNTPD
- OpenSSH
- OpenBSD sysctl configuration

## Sources Consulted
- Ansible community.general.openbsd_pkg module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/openbsd_pkg_module.html
- Ansible become plugin documentation: https://docs.ansible.com/ansible/latest/plugins/become.html
- Ansible doas become plugin documentation: https://docs.ansible.com/ansible/2.9/plugins/become/doas.html
- Ansible ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- OpenBSD rcctl(8) manual page: https://man.openbsd.org/rcctl
- OpenBSD doas.conf(5) manual page: https://man.openbsd.org/doas.conf
- OpenBSD pf FAQ: https://www.openbsd.org/faq/pf/config.html
- OpenBSD ntpd.conf(5) manual page: https://man.openbsd.org/ntpd.conf
- OpenBSD sysctl(8) manual page: https://man.openbsd.org/sysctl
- OpenBSD sysctl.conf(5) manual page: https://man.openbsd.org/sysctl.conf
- OpenBSD hostname(1) and myname(5) manual pages: https://man.openbsd.org/hostname and https://man.openbsd.org/myname

## Issues Found
- The main playbook used `ansible.posix.sysctl` for OpenBSD sysctl settings. The module manages `/etc/sysctl.conf` but reloads with Linux-style `/sbin/sysctl -p`, while OpenBSD's `sysctl(8)` sets values as `name=value` and `sysctl.conf(5)` is read at boot. Replaced it with `lineinfile` entries in `/etc/sysctl.conf` plus explicit `sysctl key=value` commands for runtime application.
- The sysctl key `net.inet.tcp.synuseithresh` was not an OpenBSD sysctl. Corrected it to `net.inet.tcp.synuselimit`, which is documented by OpenBSD.
- The infrastructure provisioning example used generic/Linux-oriented package and firewall management (`ansible.builtin.package`, `community.general.ufw`) in an OpenBSD article. Changed it to use `community.general.openbsd_pkg`, `pf.conf`, `rcctl enable pf`, and `pfctl -f /etc/pf.conf`.
- The provisioning example updated Debian-style `127.0.1.1` in `/etc/hosts`. Changed it to update the OpenBSD-relevant localhost entry.
- The provisioning example restarted `sshd` with `ansible.builtin.service`. Changed it to `rcctl restart sshd` to match the OpenBSD service-management approach used in the post.

## Review Notes
The bootstrap task assumes the target user can already escalate with doas; that is technically valid for an already prepared admin user, but a first-time OpenBSD host may need `/etc/doas.conf` prepared manually or through another bootstrap path before Ansible can use `become_method=doas`.
