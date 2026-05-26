# Validation Summary: How to Use Ansible to Disable Unnecessary Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `service_facts`, `systemd_service`, `copy`, `fetch`, `command`, `debug`, `set_fact`, and `fail` modules
- Linux service management
- systemd services and socket units
- Server hardening and service auditing

## Sources Consulted
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.fetch` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- systemctl(1) manual page: https://man7.org/linux/man-pages/man1/systemctl.1.html
- Local `systemctl --help` output for `is-enabled`, `list-dependencies --reverse`, `mask`, and socket/service unit command availability

## Issues Found
- The examples used `ansible.builtin.systemd`. The official Ansible documentation notes that `systemd` is a backward-compatible alias and recommends `ansible.builtin.systemd_service`, so the examples were updated to the current FQCN.
- The role-based service example compared bare names such as `sshd` and `nginx` against `service_facts` keys, which are commonly full systemd unit names such as `sshd.service` and `nginx.service`. The allowed service lists were updated to use full unit names.
- The role-based service example said it used host groups, but the code actually used a `server_role` variable. The explanatory sentence was corrected.
- The role-based service example indexed `role_services[server_role]`, which can fail if `server_role` is undefined or not present in the dictionary. It now uses `role_services.get(server_role | default(''), [])`.
- The compliance audit example compared prohibited bare names directly with `ansible_facts.services`, which could miss running systemd services recorded as `.service` units. The audit expression now checks running service facts against both the configured bare names and their `.service` forms.

## Review Notes
- Ansible was not installed in the local workspace, so local `ansible-playbook --syntax-check` verification could not be run.
- Service unit names vary by distribution, as the Ansible documentation notes. The examples are technically valid, but production use should tailor service names such as `ssh`/`sshd` and `cron`/`crond` to the target operating systems.
