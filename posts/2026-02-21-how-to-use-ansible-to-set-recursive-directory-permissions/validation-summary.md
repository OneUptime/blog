# Validation Summary: How to Use Ansible to Set Recursive Directory Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.file module
- ansible.builtin.find module
- ansible.builtin.command module
- ansible.posix.acl module
- Linux file permissions
- POSIX ACLs
- GNU find and chmod

## Sources Consulted
- Ansible ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.posix.acl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/acl_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- GNU Findutils manual, multiple-file -exec syntax: https://www.gnu.org/software/findutils/manual/html_node/find_html/Multiple-Files.html
- GNU Coreutils manual, directory setuid and setgid behavior: https://www.gnu.org/software/coreutils/manual/html_node/Directory-Setuid-and-Setgid.html

## Issues Found
- The ACL example used `default: yes` together with `recursive: yes` directly on `/var/log/myapp`. The official `ansible.posix.acl` documentation says `default: true` applies to directories and causes an error if the target path is a file. I changed the example to first find directories and then loop over `/var/log/myapp` plus its subdirectories when setting default ACLs. This preserves the intended behavior for newly created files while avoiding errors on existing regular files.
- Updated the explanatory text for default ACLs to clarify that default ACLs are set on directories.

## Review Notes
- The `ansible.posix.acl` module is part of the `ansible.posix` collection, not `ansible-core`; the post already notes this in the key takeaways.
- The `acl` package installation example uses `ansible.builtin.apt`, so it is Debian/Ubuntu-specific. Other distributions need the equivalent package manager.
