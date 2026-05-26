# Validation Summary: How to Use the Ansible git Module with Specific Branches

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `ansible.builtin.git` module
- Git branches, tags, and commits
- Git CLI commands
- Jinja2/Ansible conditionals
- systemd service management through Ansible

## Sources Consulted
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Git `branch` documentation: https://git-scm.com/docs/git-branch
- Git `ls-remote` documentation: https://git-scm.com/docs/git-ls-remote

## Issues Found
- The post said `force: true` discards any local changes. Ansible documents this option as discarding modified files in the working repository, so the wording was narrowed to avoid implying that every kind of local change, such as unrelated untracked files, is removed.
- The summary repeated the same overbroad `force: true` wording. It was updated to refer specifically to modified files that can be discarded.

## Review Notes
The examples use current `ansible.builtin.git` parameters and valid Ansible/Jinja2 conditional syntax. The registered `before` and `after` values are commit revisions, which matches the module return documentation. The Git commands shown are current; `git branch --show-current` and `git ls-remote <repository> refs/heads/main` are documented forms.
