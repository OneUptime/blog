# Validation Summary: How to Use Ansible to Handle Git Conflicts During Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.git
- ansible.builtin.shell
- ansible.builtin.stat
- ansible.builtin.debug
- ansible.builtin.file
- ansible.builtin.lineinfile
- community.general.git_config
- Git status, stash, diff, clean, checkout, and config commands

## Sources Consulted
- Ansible ansible.builtin.git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible community.general.git_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/git_config_module.html
- Ansible playbook error handling documentation for changed_when and failed_when: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Git stash documentation: https://git-scm.com/docs/git-stash.html
- Git status documentation: https://git-scm.com/docs/git-status
- Git clean documentation: https://git-scm.com/docs/git-clean
- Git diff documentation: https://git-scm.com/docs/git-diff

## Issues Found
- Updated the stash command from `git stash save` to `git stash push --include-untracked -m`. The official Git documentation lists `git stash push` as the current form, and the playbook checks `git status --porcelain`, which includes untracked files; `--include-untracked` makes the stash behavior match the detection.
- Updated the backup strategy from `git diff` to `git diff HEAD` for both the saved patch and the file list. Plain `git diff` only compares the working tree to the index, so staged tracked changes would be omitted from the backup report.
- Corrected the prevention task label from adding runtime directories to `.gitignore` to adding them to the repository's local exclude file. The code writes to `.git/info/exclude`, which is Git's local per-repository exclude file, not the tracked `.gitignore` file.
- Updated the summary to mention `.gitignore` or `.git/info/exclude` so it matches the preceding example.

## Review Notes
The examples are generally valid Ansible YAML and use current FQCN module names. The `community.general.git_config` module is not included in `ansible-core`; users need the `community.general` collection installed, as noted in the official module documentation.
