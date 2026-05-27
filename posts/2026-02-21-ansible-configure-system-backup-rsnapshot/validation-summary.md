# Validation Summary: How to Use Ansible to Configure System Backup (rsnapshot)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- ansible.posix authorized_key module
- rsnapshot configuration and scheduling
- rsync over SSH
- Linux cron
- Backup monitoring and restore workflows

## Sources Consulted
- rsnapshot man page, Ubuntu manpages: https://manpages.ubuntu.com/manpages/noble/man1/rsnapshot.1.html
- rsnapshot HOWTO: https://rsnapshot.org/rsnapshot/docs/docbook/rest.html
- Ubuntu Server rsnapshot guide: https://ubuntu.com/server/docs/how-to/backups/install-rsnapshot/
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/8/collections/ansible/builtin/template_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.posix.authorized_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- OpenSSH authorized_keys manual reference: https://manpages.debian.org/unstable/openssh-server/authorized_keys.5.en.html

## Issues Found
- The Ansible `template` task used `validate: "rsnapshot configtest"`. Ansible's `validate` option requires a `%s` placeholder for the temporary rendered file, and rsnapshot supports `-c` for an alternate config file. Changed it to `validate: "rsnapshot -c %s configtest"`.
- The rsnapshot template described `link_dest	1` as lazy deletes. `link_dest` enables rsync `--link-dest`; lazy deletes are controlled by `use_lazy_deletes`. Updated the comment and added `use_lazy_deletes	1`.
- The remote rsnapshot example generated a non-default SSH key but did not configure rsnapshot to use it. Added `ssh_args	-i /root/.ssh/rsnapshot_key -o IdentitiesOnly=yes` to the remote backup block.
- The remote authorized_keys example used a static forced rsync command that would not reliably match the dynamic rsync server commands rsnapshot sends for each backup path. Replaced it with baseline SSH key restrictions and updated the production tip to recommend a validating `SSH_ORIGINAL_COMMAND` wrapper for strict command restriction.

## Review Notes
- YAML code blocks parsed successfully after the edits.
- rsnapshot was not installed in the local environment, so rsnapshot behavior was verified against the rsnapshot man page, rsnapshot HOWTO, and Ubuntu Server documentation rather than by executing `rsnapshot configtest` locally.
