# Validation Summary: How to Set Default Ansible Forks for Parallel Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbook execution
- Ansible configuration (`ansible.cfg`)
- Ansible CLI (`ansible-playbook`)
- Ansible playbook keywords (`serial`, `throttle`)
- Ansible callback plugins
- Ansible fact caching
- OpenSSH server configuration

## Sources Consulted
- Ansible Community Documentation: Controlling playbook execution, strategies, forks, `serial`, and `throttle`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible Community Documentation: `ansible-playbook` CLI options, including `-f` / `--forks`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: configuration settings, including `DEFAULT_FORKS`, `ANSIBLE_FORKS`, and `DEFAULT_GATHERING`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: configuration file search order for `ansible.cfg`: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: callback plugins and `callbacks_enabled`: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible Community Documentation: `ansible.posix.profile_tasks` callback plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible Community Documentation: `ansible.builtin.ssh` connection plugin, `pipelining`, and `ssh_args`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible Community Documentation: cache plugins and fact caching: https://docs.ansible.com/ansible/latest/plugins/cache.html
- OpenBSD manual page for `sshd_config`, including `MaxStartups`: https://man.openbsd.org/sshd_config

## Issues Found
- The post listed the OpenSSH default `MaxStartups` value as `10:30:60`. Current OpenSSH documentation lists the default as `10:30:100`. Updated the text and clarified that random early drop starts after the initial threshold, so connections may be dropped rather than always being dropped.
- The optimized `ansible.cfg` example used `callback_whitelist = timer, profile_tasks`, which is the older callback enabling setting. Current Ansible documentation uses `callbacks_enabled`; the timing callbacks are provided by `ansible.posix` in current collection documentation. Updated the example to `callbacks_enabled = ansible.posix.timer, ansible.posix.profile_tasks`.

## Review Notes
- The main `forks` guidance, `ANSIBLE_FORKS` environment variable, `ansible-playbook -f`, `serial`, and `throttle` explanations match current Ansible documentation.
- The `ansible.posix` callback names assume the `ansible.posix` collection is installed. This is commonly present with the full `ansible` package, but users of only `ansible-core` may need to install the collection.
- Local CLI verification with `ansible-playbook --help` was not possible because `ansible-playbook` is not installed in this workspace; official Ansible CLI documentation was used instead.
