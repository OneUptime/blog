# Validation Summary: How to Use the Ansible subelements Lookup Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible lookup plugins
- Ansible `subelements` lookup and filter
- Ansible playbook loops
- Ansible built-in modules: `user`, `file`, `template`, `command`, `cron`
- Ansible collections: `ansible.posix`, `community.mysql`
- Certbot CLI
- firewalld

## Sources Consulted
- Ansible `ansible.builtin.subelements` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/subelements_lookup.html
- Ansible filter documentation for `ansible.builtin.subelements`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html#combining-objects-and-subelements
- Ansible loop documentation, especially `query()` versus `lookup()` for list input: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible `community.mysql.mysql_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Certbot CLI documentation: https://eff-certbot.readthedocs.io/en/stable/using.html

## Issues Found
- The examples used `lookup('subelements', ...)` directly with `loop`. Ansible's loop documentation says `loop` requires list input and recommends `query()` for lookup plugins because `query()` always returns a list. Updated the examples to use `query('ansible.builtin.subelements', ...)`.
- The virtual-host example claimed to create certificates for all domains and aliases, but the loop iterated only over `aliases`. Updated the task name to say it creates certificates for aliases.
- The tips section said the plugin works one level deep. The official `subelements` lookup supports dotted nested keys such as `mysql.hosts`, but it pairs each parent with one sub-list at a time. Updated the note to make that distinction accurate.

## Review Notes
- YAML code blocks parse successfully as YAML after the edits.
- The examples are structurally correct, but they assume the relevant collections are installed (`ansible.posix` and `community.mysql`) and that target hosts have required services and dependencies such as firewalld, PyMySQL, Nginx, and Certbot.
