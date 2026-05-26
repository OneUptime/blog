# Validation Summary: How to Use Ansible to Manage User SSH Config

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- OpenSSH client configuration (`ssh_config`)
- SSH jump hosts with `ProxyJump`
- Jinja2 templates
- File permissions for SSH-related files

## Sources Consulted
- OpenSSH `ssh_config(5)` manual: https://manpages.ubuntu.com/manpages/jammy/man5/ssh_config.5.html
- OpenSSH `ssh(1)` local manual and `ssh -G` behavior from OpenSSH_9.6p1
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.blockinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/blockinfile_module.html

## Issues Found
- OpenSSH config ordering was described as if later specific `Host` stanzas can override earlier wildcard values. OpenSSH uses the first obtained value for each parameter, so I updated the explanation and moved wildcard defaults after host-specific entries where needed.
- The jump-host example placed `Host internal-*` before `Host internal-db1`, which would prevent `User postgres` from taking effect because `User deploy` would already be set. I moved the wildcard stanza after the specific internal hosts.
- The global SSH config example placed `Host *` before the internal network stanza, so `StrictHostKeyChecking no` would not override `accept-new`. I moved the internal stanza before the wildcard defaults.
- The system-wide SSH config wording implied those settings apply regardless of user-specific config. OpenSSH reads user config before system-wide config, so I clarified that these are defaults and that `/etc/ssh/ssh_config.d/` depends on being included by the main client config.
- The multi-user example reused the earlier template without providing all variables referenced by that template. I added `user`, `port`, and `ssh_defaults` values so the template can render correctly.
- The CI/CD example used Jinja control flow inside `ansible.builtin.copy` content. Ansible documentation recommends `ansible.builtin.template` for variable interpolation and advanced formatting, so I changed the example to use a template file.
- The post claimed SSH refuses to use overly permissive SSH config files. Local OpenSSH testing showed `ssh -G` accepted config files broader than `0600`; the strict permission refusal primarily applies to private keys. I revised the wording to recommend `0600` as a privacy-focused default.

## Review Notes
The examples intentionally use `StrictHostKeyChecking no` and `UserKnownHostsFile /dev/null` in internal and CI/CD contexts. Those settings can be useful for automation but reduce host key verification protections; future edits could add a security caveat without changing the core tutorial.
