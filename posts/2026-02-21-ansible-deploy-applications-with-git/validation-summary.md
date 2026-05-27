# Validation Summary: How to Use Ansible to Deploy Applications with Git

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: git, file, copy, command, find, stat, slurp, include_tasks, systemd
- Git-based deployment
- SSH deploy keys
- npm install commands
- systemd service restarts

## Sources Consulted
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible file module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible find module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible stat module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible copy module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/

## Issues Found
- The deploy key SSH config disabled host-key checking with `StrictHostKeyChecking no` and `UserKnownHostsFile /dev/null`. The Ansible git module documentation warns that this disables MITM protection. I removed those options and kept `IdentitiesOnly yes`.
- The Git tasks used `accept_hostkey: yes`, which maps to disabling strict host-key checking. I changed the examples to `accept_newhostkey: yes`, the current safer option documented for OpenSSH 7.5+ and ansible-core 2.12+.
- The npm command used `npm ci --production`. Current npm documentation recommends omitting development dependencies with `--omit=dev`, so I updated the variable example.
- The rollback playbook registered the current symlink but did not use it, assuming the newest release was always the current release. I changed the rollback logic to read the current symlink target and select the release immediately before it.
- The rollback playbook notified `restart application` but did not define a handler in the standalone playbook. I added the handler so the rollback example is complete.
- The optional failed-release cleanup removed the newest release instead of the release currently being rolled back from. I changed it to remove `current_release`.

## Review Notes
- The examples use short Ansible module names, which remain valid for built-in modules. The Ansible documentation recommends fully qualified collection names for linkability and conflict avoidance, but that is not required for correctness.
- The `accept_newhostkey` option requires ansible-core 2.12+ and OpenSSH 7.5+ on the target executing Git operations.
