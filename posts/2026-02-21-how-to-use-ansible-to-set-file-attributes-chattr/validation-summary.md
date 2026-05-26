# Validation Summary: How to Use Ansible to Set File Attributes (chattr)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.file
- ansible.builtin.command
- Linux file attributes
- chattr
- lsattr
- YAML playbooks

## Sources Consulted
- Ansible Core documentation for ansible.builtin.file: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible documentation for ansible.builtin.command: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Lint documentation for command tasks and changed_when: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- chattr(1) Linux manual page from e2fsprogs: https://man7.org/linux/man-pages/man1/chattr.1.html
- lsattr(1) Linux manual page from e2fsprogs: https://man7.org/linux/man-pages/man1/lsattr.1.html
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The post described `chattr` flags as "extended file attributes." I changed this to "Linux file attributes" because `chattr` manages filesystem file flags, which are distinct from user extended attributes managed through xattr-style tools.
- The post overstated immutable and append-only behavior by saying root cannot modify or truncate protected files. I clarified that these operations are blocked while the attribute is set, but a sufficiently privileged user can clear the attribute first.
- The post implied the `command` module is needed to set multiple attributes at once. I changed this to explain that the `file` module can also set multiple attributes, while `command` is useful when direct `chattr` invocation is desired.
- The idempotent command example checked for the literal substring `'----i'` in the full `lsattr` output. I changed it to inspect the first whitespace-delimited field and look for `i`, matching the later audit example and avoiding dependence on the path portion of the output.
- I added a filesystem support caveat for attributes such as `s` and `u`, which are documented by `chattr(1)` as not honored by ext2, ext3, or ext4 in current mainline Linux kernels.

## Review Notes
The examples are syntactically valid Ansible task snippets. The `file` module's `attributes` parameter is the preferred idempotent approach for ordinary `chattr` flags; direct `command` examples are valid but should be used with explicit `changed_when` logic when accurate change reporting matters.
