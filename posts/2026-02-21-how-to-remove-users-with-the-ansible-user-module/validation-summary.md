# Validation Summary: How to Remove Users with the Ansible user Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.user` module
- Ansible `ansible.builtin.file` module
- Ansible `community.general.archive` module
- Linux `userdel`
- Linux `pgrep` and `pkill`
- GNU `find`
- SSH authorized keys and sudoers cleanup

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `community.general.archive` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/archive_module.html
- Linux `userdel(8)` manual page: https://www.man7.org/linux/man-pages/man8/userdel.8%40%40shadow-utils.html
- Linux `pgrep(1)` / `pkill(1)` manual page: https://man7.org/linux/man-pages/man1/pgrep.1.html
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Local command help output for `userdel --help`, `pgrep --help`, `pkill --help`, and `find --help`

## Issues Found
- The archive examples wrote to `/var/backups/users/...`, but `community.general.archive` requires the destination parent directory to exist. Added `ansible.builtin.file` tasks to create `/var/backups/users` with mode `0700` before archiving.
- The SSH revocation example said `password_lock: yes` locks the account and prevents all new logins. Ansible documents `password_lock` as locking only the password, and notes that other login methods may still work. Updated the wording to say it prevents password logins.
- The `force` section said `force: yes` controls files outside the home directory owned by the user. Ansible documents `force` as forcing removal of the user and associated directories on supported platforms, equivalent to `userdel --force`; `userdel -r` documentation says files in other file systems must be searched for and deleted manually. Updated the explanation.

## Review Notes
- `community.general.archive` is part of the `community.general` collection and is not included in `ansible-core`; environments that install only `ansible-core` need that collection installed.
- The cleanup example correctly uses `find -nouser` to identify files whose numeric owner no longer maps to a user, but production playbooks should review results before deleting outside narrow temporary paths.
