# Validation Summary: How to Use Ansible Special Variables (playbook_dir, role_path)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible special variables / magic variables
- Ansible playbooks and roles
- Ansible built-in modules: debug, copy, script, file, command, include_vars, stat, fail, template
- Ansible built-in lookups: file, fileglob
- ansible-playbook CLI

## Sources Consulted
- Ansible Special Variables: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible Search paths in Ansible: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible facts and magic variables guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- ansible.builtin.script module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- ansible.builtin.import_playbook module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- ansible.builtin.file lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_lookup.html
- ansible.builtin.fileglob lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html

## Issues Found
- Corrected the `role_path` availability description. Static role files are not an execution context for variables, so the text now says `role_path` is available inside role tasks, handlers, and templates rendered by role tasks.
- Replaced a `slurp` example that tried to read `{{ role_path }}/files/custom-config.txt`. `slurp` reads from the managed node, while `role_path` points to the controller-side role path. The example now uses the `ansible.builtin.file` lookup to read from the controller.
- Reworked the migration example. `ansible.builtin.find` searches paths on the managed node and requires fully qualified target paths, so using it directly with `role_path` was incorrect. The example now uses `ansible.builtin.fileglob` to enumerate controller-side role files, copies them to a managed-node staging directory, and runs `psql` with `ansible.builtin.command`.
- Corrected the `import_playbook` gotcha. Ansible documents `playbook_dir` as the directory of the current playbook being executed, which can differ from the playbook passed to `ansible-playbook`; the post previously stated that it still points to the main playbook directory.

## Review Notes
Ansible was not installed in the local environment, so examples were validated against current official Ansible documentation rather than by running `ansible-playbook --syntax-check`.
