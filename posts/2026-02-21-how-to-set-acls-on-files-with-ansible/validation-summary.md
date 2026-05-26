# Validation Summary: How to Set ACLs on Files with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.posix.acl module
- Linux POSIX Access Control Lists
- setfacl and getfacl
- YAML playbook syntax

## Sources Consulted
- Ansible Community Documentation: ansible.posix.acl module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/acl_module.html
- Linux man-pages: setfacl(1) - https://man7.org/linux/man-pages/man1/setfacl.1.html
- Linux man-pages: getfacl(1) - https://man7.org/linux/man-pages/man1/getfacl.1.html
- Linux man-pages: acl(5) - https://man7.org/linux/man-pages/man5/acl.5.html

## Issues Found
- The recursive monitoring ACL used `permissions: rx` while the surrounding text described read access. This would also add execute permission to regular files. Changed it to `permissions: rX`, which grants execute/search only for directories or files that already have execute permission.
- The default ACL section said new files would automatically receive `rwx` access. Linux ACL inheritance is still limited by the file creation mode, so regular files usually do not receive execute permission unless requested by the creating process. Updated the explanation to reflect that behavior.
- The complete role described mode `2770` as setting the group sticky bit. The leading `2` sets the setgid bit, not the sticky bit. Updated the task name to say setgid bit.

## Review Notes
The examples use the current `ansible.posix.acl` fully qualified collection name and current parameters. The module is part of the `ansible.posix` collection rather than `ansible-core`, so environments that install only `ansible-core` must install that collection separately.
