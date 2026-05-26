# Validation Summary: How to Use vars_files in Ansible Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible variables
- `vars_files`
- `ansible.builtin.include_vars`
- Ansible Vault
- YAML

## Sources Consulted
- Ansible Community Documentation: Playbook keywords, `vars_files` definition: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Community Documentation: Using variables, external variable files, and variable precedence: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: Selecting variable files based on facts, including `vars_files` fallback lists: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible Community Documentation: `ansible.builtin.include_vars` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible Community Documentation: `ansible-playbook` CLI options for Vault passwords: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Ansible Vault encrypted content and variable files: https://docs.ansible.com/ansible/latest/vault_guide/vault_using_encrypted_content.html

## Issues Found
- The post described `vars_files` and `vars` as being evaluated at "play parse time." Ansible documentation shows `vars_files` can be interpolated after fact gathering when facts are used in the filename, so I changed this wording to "before explicit tasks and roles" and "play definition" where appropriate.
- The post said variables used in `vars_files` paths need to come from inventory, the command line, or `vars`. Ansible's official examples use gathered facts in `vars_files` paths, so I added gathered facts to the list of valid sources.
- The precedence table labeled `include_vars` as simply "Highest." Official precedence rules show that `include_vars` is higher than `vars` and `vars_files`, but still lower than sources such as registered variables, `set_fact`, include parameters, and extra vars. I changed this to "Highest of these three."
- The summary said to use `include_vars` for variables loaded dynamically based on "conditions or facts." Since official docs support fact-based `vars_files` filenames, I narrowed this to task results or `when` conditions.

## Review Notes
The code examples and Vault commands are broadly consistent with current Ansible documentation. I could not run `ansible-playbook --syntax-check` locally because Ansible is not installed in this workspace environment.
