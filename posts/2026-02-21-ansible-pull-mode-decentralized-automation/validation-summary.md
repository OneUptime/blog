# Validation Summary: How to Use Ansible Pull Mode for Decentralized Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-pull
- Ansible playbooks, tasks, handlers, and variables
- Git-backed configuration repositories
- Cron scheduling
- Linux package and service management

## Sources Consulted
- Ansible Core `ansible-pull` CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-pull.html
- Local Ansible 2.21.0 `python3 -m ansible.cli.pull --help`
- Ansible implicit localhost documentation: https://docs.ansible.com/ansible/latest/inventory/implicit_localhost.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `include_tasks` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible `git` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html

## Issues Found
- The post said `ansible-pull` defaults directly to `local.yml`. Official documentation and the installed Ansible 2.21.0 source show that it first tries a playbook named after the fully qualified hostname, then the short hostname, and finally `local.yml`. Updated the description accordingly.
- The post said a different playbook could be specified with `-d` and a playbook path. `-d` sets the checkout directory; the playbook path is a positional argument. Updated the wording to avoid implying that `-d` selects the playbook.
- The complete example placed `handlers:` inside included task files under individual tasks, which is not valid playbook structure for the shown `include_tasks` usage. Moved the handlers into the main `local.yml` play and left the task files as task lists.
- The apt-based SSH hardening example used service name `sshd`, which is typically not the Debian/Ubuntu service name. Changed the handler and notification to `ssh` to match the Debian-family package-management context.

## Review Notes
The private repository example using `--private-key` is valid for `ansible-pull`; Ansible passes that option through to the Git module as `key_file`. For large fleets, the official `ansible-pull` documentation also recommends external scheduling or locking to avoid concurrent runs of the same CLI tool, which could be a useful future addition.
