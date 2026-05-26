# Validation Summary: How to Use Ansible Ad Hoc Commands to Transfer Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.copy
- ansible.builtin.template
- ansible.builtin.fetch
- ansible.posix.synchronize
- rsync
- Linux shell commands

## Sources Consulted
- Ansible ad hoc command documentation: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.fetch module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- ansible.posix.synchronize module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible delegation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html

## Issues Found
- The post said the copy module calculates an MD5 checksum. The current Ansible documentation describes the primary returned checksum as SHA1 and separately lists md5sum only when supported, so the text was changed to say the module uses checksums.
- The post did not mention that synchronize is supplied by the ansible.posix collection rather than ansible-core. Added a short caveat matching the official module documentation.
- The rsync_opts ad hoc examples used a comma-packed string. The synchronize module expects a list of strings, so those examples were changed to JSON-style ad hoc arguments with rsync_opts arrays.
- The remote-to-remote synchronize example tried to use delegate_to through extra vars. delegate_to is a playbook task keyword, not an ad hoc extra var. Replaced it with an ad hoc shell command that runs rsync from the source host to the destination host.
- The performance section said rsync can resume interrupted transfers. The example did not include partial-transfer options, so the wording was narrowed to rsync skipping unchanged files and transferring changed data when possible.

## Review Notes
The remaining examples are broadly accurate for current Ansible usage. The synchronize examples assume the ansible.posix collection and rsync are installed where required, and that SSH authentication is already configured.
