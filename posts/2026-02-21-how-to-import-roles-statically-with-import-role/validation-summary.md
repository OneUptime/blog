# Validation Summary: How to Import Roles Statically with import_role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.import_role
- ansible.builtin.include_role
- Ansible playbook tags, conditionals, handlers, and blocks
- YAML playbook snippets

## Sources Consulted
- Ansible `ansible.builtin.import_role` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/import_role_module.html
- Ansible `ansible.builtin.include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Reusing Ansible artifacts guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse.html
- Ansible Tags guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Conditionals guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible Blocks guide: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html

## Issues Found
- Corrected the comparison table entry for variable role names. `import_role` can use templated role names only when the variable is available during import pre-processing, such as via `vars` or `--extra-vars`; it cannot use inventory or runtime-only variables the same way `include_role` can.
- Corrected the handler visibility comparison. Official docs state handlers from both `import_role` and `include_role` are made available to the whole play, but static imports are available after parsing while dynamic includes are processed at runtime.
- Corrected the error-handling section. `import_role` can be used inside a `block/rescue`; because it is expanded statically, the block handles failures from the individual expanded role tasks rather than treating the import as a single runtime task.
- Updated the recommendation and wrap-up text so the stated limitation is runtime-only role name variables, not all variable role names.

## Review Notes
The examples use current fully qualified Ansible module names and valid YAML structure. `ansible-playbook` was not installed in the local environment, so CLI behavior was verified against official Ansible documentation rather than local command output.
