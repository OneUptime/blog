# Validation Summary: How to Use Ansible Ad Hoc Commands to Update Hosts File

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.lineinfile
- ansible.builtin.blockinfile
- ansible.builtin.copy
- ansible.builtin.fetch
- Linux /etc/hosts file format
- Shell commands for verification and auditing

## Sources Consulted
- Ansible ad hoc command guide: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.blockinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/blockinfile_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.fetch module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/fetch_module.html
- Linux hosts(5) manual page: https://man7.org/linux/man-pages/man5/hosts.5.html

## Issues Found
- The post stated that using `lineinfile` with `regexp` ensures duplicate entries are not created. Ansible's `lineinfile` documentation specifies that for `state=present`, only the last matching line is replaced. I updated the explanation to say this prevents adding a duplicate when there is a single existing matching entry.

## Review Notes
The ad hoc command syntax, `--one-line`, `--check`, `--diff`, `--become`, module parameters, block markers, `copy` backups, remote-source copy usage, and `/etc/hosts` entry examples are consistent with the consulted documentation. Ansible was not installed in the local environment, so command behavior was checked against official documentation rather than local CLI execution.
