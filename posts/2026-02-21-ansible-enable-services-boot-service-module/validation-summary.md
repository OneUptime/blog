# Validation Summary: How to Enable Services at Boot with the Ansible service Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.service
- ansible.builtin.service_facts
- ansible.builtin.assert
- systemd / systemctl
- OpenRC service runlevels
- Linux service management

## Sources Consulted
- Ansible official documentation: ansible.builtin.service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible official documentation: ansible.builtin.service_facts module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible official documentation: ansible.builtin.assert module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible official documentation: conditionals - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- systemd official systemctl manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Local systemctl help output for command availability and flags

## Issues Found
- The runlevel section described `runlevel` as a SysV init feature. Current Ansible documentation states that `ansible.builtin.service.runlevel` is for OpenRC init scripts only, so the heading, explanation, comment, service name, and example runlevel value were corrected to OpenRC.
- The critical-services assertion used `{{ item }}` inside an `assert.that` expression. Ansible documents `assert.that` expressions as using the same form as `when`, and conditionals should use raw Jinja expressions without template delimiters. The expression was changed to `ansible_facts.services[item + '.service'].status == 'enabled'`.

## Review Notes
- The post uses generic service names such as `cron`, `sshd`, `firewalld`, and `chronyd`; these are valid on some distributions but vary across Linux families. Future revisions could call out distribution-specific service naming when showing cross-platform playbooks.
