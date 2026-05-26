# Validation Summary: How to Set Up Multiple Ansible Configuration Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible configuration files
- Ansible CLI tools: `ansible`, `ansible-playbook`, `ansible-config`
- Ansible callback plugins
- Ansible inventory and Vault configuration
- Makefile targets
- Bash wrapper scripts
- direnv environment loading

## Sources Consulted
- Ansible Configuration Settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible configuration precedence rules: https://docs.ansible.com/projects/ansible-core/2.19/reference_appendices/general_precedence.html
- `ansible-config` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-config.html
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- `ansible.builtin.default` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- `community.general.yaml` callback removal notice: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_callback.html
- `ansible.posix.timer` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- `community.general.log_plays` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/log_plays_callback.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- direnv shell hook documentation: https://direnv.net/docs/hook.html

## Issues Found
- The post used `stdout_callback = yaml`, but the `community.general.yaml` callback has been removed and superseded by `callback_result_format = yaml` on the `ansible.builtin.default` callback. Updated the examples to use `stdout_callback = default` and `callback_result_format = yaml`.
- The `configs/dev.cfg` and `configs/production.cfg` examples used project-root-relative paths such as `inventory/dev.ini`. Ansible resolves many relative config paths relative to the active configuration file, so those examples could point to the wrong location. Updated them to use `../inventory/dev.ini`, `../inventory/production.ini`, and `../.vault_pass`.
- The callback examples used short names for callbacks that now live in collections. Updated `timer`, `profile_tasks`, and `log_plays` to fully qualified callback names where used: `ansible.posix.timer`, `ansible.posix.profile_tasks`, and `community.general.log_plays`.
- The shell wrapper called `shift` before checking whether an environment argument was supplied, which can emit a shell error when run without arguments. Moved `shift` after the empty-argument check.

## Review Notes
The callback examples using `ansible.posix` and `community.general` assume those collections are installed. They are commonly available with the full Ansible community package, but not with a minimal `ansible-core` installation.
