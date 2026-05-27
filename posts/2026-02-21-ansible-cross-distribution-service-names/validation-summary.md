# Validation Summary: How to Use Ansible to Handle Cross-Distribution Service Names

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: service, systemd_service, include_vars, package, lineinfile, setup, hostname, uri, command, fail, copy, cron
- Ansible community.general modules: ufw, timezone
- Linux service managers: systemd and OpenRC
- Cross-distribution Linux service naming
- Debian/Ubuntu, RHEL/CentOS/Rocky, SUSE, and Alpine Linux

## Sources Consulted
- Ansible ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.systemd redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible ansible.builtin.include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible ansible.builtin.first_found lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible ansible.builtin.package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Debian systemd documentation: https://wiki.debian.org/systemd
- Debian openssh ssh.service unit source: https://sources.debian.org/src/openssh/1%3A10.0p1-7/debian/systemd/ssh.service
- Red Hat Enterprise Linux OpenSSH documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-openssh
- Alpine Linux OpenRC documentation: https://docs.alpinelinux.org/user-handbook/0.1a/Working/openrc.html

## Issues Found
- The introductory systemd example used `ansible.builtin.systemd`. Current Ansible documentation names the module `ansible.builtin.systemd_service`, with `ansible.builtin.systemd` kept as an alias. Updated the examples and summary text to use `ansible.builtin.systemd_service`.
- The problem statement said `sshd` simply fails on Debian. Debian documents `ssh.service` as the canonical service name, while current OpenSSH packaging can provide an `sshd.service` alias. Changed the wording to say `ssh` is canonical and `sshd` may fail where the alias is unavailable.
- The playbook examples created files under `vars/` but loaded `services_*.yml` and `os_*.yml` without the `vars/` path in non-role playbooks. Updated the `include_vars` calls to load from `vars/`.
- The infrastructure provisioning example hardcoded `sshd`, which contradicted the post's cross-distribution service mapping. Updated the handler to use `services.ssh` and added the OS variable loading pre-task needed for that variable.
- The infrastructure provisioning example used `community.general.ufw` as if it were cross-distribution. Added conditions so the UFW tasks only run when the selected firewall service is `ufw`.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current documentation places the timezone module in `community.general`. Updated it to `community.general.timezone`.

## Review Notes
The YAML snippets were parsed successfully after the corrections. Ansible and ansible-lint were not installed in the local environment, so full `ansible-playbook --syntax-check` validation could not be run.
