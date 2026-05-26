# Validation Summary: How to Use Ansible -vvvv for Maximum Verbosity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- ansible ad-hoc CLI
- SSH connection debugging
- Ansible callback plugins
- ansible.cfg configuration

## Sources Consulted
- Ansible Community Documentation: ansible-playbook CLI, https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: ansible ad-hoc CLI, https://docs.ansible.com/ansible/latest/cli/ansible.html
- Ansible Community Documentation: Configuration settings, https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: Callback plugins, https://docs.ansible.com/ansible/latest/plugins/callback.html
- Ansible Community Documentation: ansible.posix.timer callback, https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible Community Documentation: ansible.posix.profile_tasks callback, https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Local verification with ansible-core 2.21.0 `ansible-playbook --help`

## Issues Found
- The post described `-vvvv` as absolute maximum verbosity. Current Ansible documentation says multiple `-v` flags increase verbosity and built-in plugins currently evaluate up to `-vvvvvv`, while connection debugging may require `-vvvv`. I revised the wording to describe `-vvvv` as connection-debug verbosity rather than absolute maximum verbosity.
- The post said level 3 shows timing information. Verbose output can include module result duration fields, but `-vvv` is not the documented way to profile slow tasks. I removed the timing claim from the level 3 description.
- The slow-playbook scenario recommended `ANSIBLE_CALLBACKS_ENABLED=timer` for task timing. The documented `ansible.posix.timer` callback adds total play duration, while `ansible.posix.profile_tasks` provides individual task timing. I changed the example to `ANSIBLE_CALLBACKS_ENABLED=ansible.posix.profile_tasks`.
- The `ansible.cfg` snippet labeled default verbosity as `0-4`. Current Ansible documentation defines `verbosity` as equivalent to the number of `-v` flags, and current built-in plugins evaluate up to `-vvvvvv`. I changed the comment to avoid an incorrect range.

## Review Notes
The remaining CLI examples use valid `ansible-playbook` and `ansible` verbosity flags. The `verbosity = 1` configuration example is valid under `[defaults]`; the current configuration reference maps it to default verbosity equivalent to passing `-v` on the command line.
