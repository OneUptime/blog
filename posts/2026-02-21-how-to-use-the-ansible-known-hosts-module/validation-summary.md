# Validation Summary: How to Use the Ansible known_hosts Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.known_hosts
- SSH known_hosts files
- OpenSSH ssh-keyscan
- Ansible host key checking configuration

## Sources Consulted
- Ansible `ansible.builtin.known_hosts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- Ansible connection details and host key checking documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- Ansible configuration setting `HOST_KEY_CHECKING`: https://docs.ansible.com/projects/ansible-core/2.18/reference_appendices/config.html#host-key-checking
- OpenSSH `ssh-keyscan(1)` manual page: https://man.openbsd.org/ssh-keyscan.1
- OpenSSH `sshd(8)` known_hosts file format documentation: https://man.openbsd.org/sshd#SSH_KNOWN_HOSTS_FILE_FORMAT

## Issues Found
- The post said Ansible always refuses to connect when `host_key_checking = true` and a key is missing. Ansible documentation says a new host may prompt for confirmation, while non-interactive automation can fail. Updated the wording to say Ansible prompts for confirmation or fails in non-interactive runs.
- The final bootstrap example scanned both `ed25519` and `rsa` host keys but added only the first line from `stdout_lines`. Updated the loop to use `subelements('stdout_lines')` so every scanned key line is added to `known_hosts`.

## Review Notes
- The `ssh-keyscan` examples are syntactically valid and use current options. The post correctly warns that host keys should be verified; `ssh-keyscan` alone does not authenticate the first key retrieved.
- The `known_hosts` examples use the current fully qualified module name and valid parameters, including `name`, `key`, `path`, `state`, and `hash_host`.
