# Validation Summary: How to Create System Users with the Ansible user Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.user` module
- Ansible `ansible.builtin.group` module
- Ansible `ansible.builtin.file` module
- Ansible `ansible.builtin.copy` module
- Ansible `ansible.builtin.systemd` module
- Linux user and group management
- `useradd --system`
- systemd service unit configuration

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Linux `useradd(8)` manual page: https://man7.org/linux/man-pages/man8/useradd.8.html
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html

## Issues Found
- The post described system user UID ranges as typically `100-999` and showed that range in the diagram. I changed this to describe the range as target-system configuration, often below 1000, because `useradd` uses `SYS_UID_MIN` and `SYS_UID_MAX` from `/etc/login.defs`.
- The post implied that `system: yes` in Ansible skips home directory creation by default. I clarified that Linux `useradd --system` does not create a home directory unless requested, but Ansible's `create_home` option defaults to `yes`, so `create_home: no` should be explicit when no home directory is desired.
- The post used `/usr/sbin/nologin` as if it were universal. I changed the best-practice wording to use the target distribution's `nologin` path, such as `/usr/sbin/nologin` or `/sbin/nologin`.
- The PostgreSQL UID/GID example said `26` is conventional on many distributions. I narrowed that to some RPM-based distributions and added a reminder to check the target distribution before hard-coding service UIDs and GIDs.
- The system-user comparison diagram overstated home-directory behavior. I changed it to describe home directories as optional for system users and commonly created for regular users.

## Review Notes
The Ansible examples use valid YAML and current fully qualified Ansible module names. The systemd unit fields shown are valid for a simple service. `ansible.builtin.systemd` remains available, though newer Ansible documentation may redirect to `ansible.builtin.systemd_service`.
