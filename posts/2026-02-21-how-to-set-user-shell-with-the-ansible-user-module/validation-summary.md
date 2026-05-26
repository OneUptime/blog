# Validation Summary: How to Set User Shell with the Ansible user Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.user` module
- Ansible `ansible.builtin.stat`, `getent`, `set_fact`, `debug`, `apt`, `dnf`, and `lineinfile` modules
- Linux user account shell configuration
- `/etc/shells`, `nologin`, `useradd`, and `usermod`

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.getent` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/getent_module.html
- Linux `shells(5)` manual page: https://man7.org/linux/man-pages/man5/shells.5.html
- Linux `nologin(8)` manual page: https://man7.org/linux/man-pages/man8/nologin.8.html
- Local `useradd --help` and `usermod --help` output for `-s/--shell` option behavior

## Issues Found
- The post said the default shell always comes from `/etc/default/useradd`. Ansible documents that the default is determined by the underlying platform tool, with `useradd` used on most non-macOS platforms. Updated the sentence to describe `/etc/default/useradd` as a common Linux `useradd` configuration source rather than a universal source.
- The per-environment shell example referenced `env` without defining it in the snippet. Added `env: production` so the example is self-contained.
- The multiple-user example checked shell paths with `stat` but still set user shells even when a required shell was missing. Added `failed_when: not shell_checks.stat.exists` to stop before applying invalid shell assignments.

## Review Notes
The main Ansible module usage is current and uses fully qualified collection names. Ansible was not installed in the local environment, so examples were reviewed against official Ansible documentation rather than executed with `ansible-playbook`.
