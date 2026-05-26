# Validation Summary: How to Use Ansible loop with query and lookup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible lookup plugins
- Ansible `lookup`, `query`, and `q` functions
- Ansible loops and `loop_control`
- Ansible built-in lookup plugins: `fileglob`, `lines`, `env`, `sequence`, `inventory_hostnames`, `dict`, `pipe`, `first_found`, and `vars`
- Ansible built-in modules: `debug`, `copy`, `lineinfile`, `stat`, `apt`, `template`, `include_vars`, `cron`, and `systemd`
- Ansible Vault encrypted variables

## Sources Consulted
- Ansible lookup plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible playbook lookup guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible `ansible.builtin.fileglob` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- Ansible `ansible.builtin.file` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible `ansible.builtin.lines` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lines_lookup.html
- Ansible `ansible.builtin.pipe` lookup documentation: https://docs.ansible.com/projects/ansible-core/2.15/collections/ansible/builtin/pipe_lookup.html
- Ansible `ansible.builtin.sequence` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/sequence_lookup.html
- Ansible `ansible.builtin.inventory_hostnames` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/inventory_hostnames_lookup.html
- Ansible `ansible.builtin.first_found` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible `ansible.builtin.vars` lookup documentation: https://docs.ansible.com/ansible/4/collections/ansible/builtin/vars_lookup.html
- Ansible built-in collection lookup plugin index: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/index.html

## Issues Found
- The package-list example used `map('lookup', 'file')`, but `lookup` is an Ansible templating function, not a Jinja filter usable through `map`. Replaced the expression with a `pipe` lookup that reads matching package-list files and then splits the string into loop items.
- The Docker example used `query('pipe', 'docker ps -q')` and then treated the result as a string. Since `query` returns a list, changed it to `lookup('pipe', 'docker ps -q')` before splitting the command output.
- The Vault section claimed to read encrypted values but did not perform any lookup or use `vault_key`. Added a `vars` lookup so each loop item resolves the named vault-encrypted variable.
- The `first_found` example wrapped `query('first_found', params)` in another list, which would make the loop item a nested list instead of the found file path. Changed the loop to use the query result directly.
- The cached `fileglob` example used `**/*.conf`, but the official `fileglob` lookup matches a single directory non-recursively. Changed the pattern to `*.conf`.

## Review Notes
- The post uses short lookup plugin names such as `fileglob` and `pipe`. Ansible documentation recommends fully qualified collection names for clearer links and avoiding name conflicts, but the short names remain valid for `ansible.builtin` lookup plugins.
- Ansible was not installed in the local environment, so validation was performed against official Ansible documentation rather than by executing the snippets locally.
