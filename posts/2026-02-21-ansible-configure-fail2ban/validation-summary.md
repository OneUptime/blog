# Validation Summary: How to Use Ansible to Configure fail2ban

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- fail2ban
- Linux service management
- fail2ban jails and filters
- nginx log filtering
- SSH brute force protection
- Prometheus text-format metrics scripts

## Sources Consulted
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- fail2ban default jail configuration: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- fail2ban `sshd` filter definition: https://github.com/fail2ban/fail2ban/blob/master/config/filter.d/sshd.conf
- fail2ban `nginx-botsearch` filter definition: https://github.com/fail2ban/fail2ban/blob/master/config/filter.d/nginx-botsearch.conf
- fail2ban `nginx-limit-req` filter definition: https://github.com/fail2ban/fail2ban/blob/master/config/filter.d/nginx-limit-req.conf
- fail2ban-client manual page: https://github.com/fail2ban/fail2ban/blob/master/man/fail2ban-client.1

## Issues Found
- The example used `filter: sshd-ddos` for the `sshd-ddos` jail. Current fail2ban configuration uses the `sshd` filter with `mode = ddos` for this behavior, so the post now sets `filter: sshd`, adds `mode: ddos`, and renders `mode` in the jail template.
- The variable `fail2ban_version` was used as the Ansible package module `state`. Because `latest` is a package state rather than a version pin, this was renamed to `fail2ban_package_state` in the variable example and package task.
- The verification playbook selected enabled jails with `selectattr('enabled', 'equalto', true)`, which would skip conditionally enabled jails represented as templated strings. It now loops over all jails and uses `when: item.enabled | bool`, with the display task guarding skipped loop results.

## Review Notes
The examples are broadly valid for Debian/Ubuntu-style paths such as `/var/log/auth.log`. Other distributions may require different SSH log paths or a systemd journal backend, but the post's templates expose `logpath` and `backend` variables for that adjustment.
