# Validation Summary: How to Debug Ansible Privilege Escalation Failures

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible privilege escalation (`become`)
- Ansible ad hoc commands and playbooks
- Ansible inventory variables
- Ansible configuration (`ansible.cfg`)
- sudo and sudoers
- Ansible Vault

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- `ansible.builtin.sh` shell plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sh_shell.html
- `ansible.builtin.sudo` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Author GitHub profile: https://github.com/nawazdhandala

## Issues Found
- The post described RHEL/CentOS default sudoers as requiring a TTY. I changed this to "older RHEL/CentOS configurations" because current distributions and installations vary, while `Defaults requiretty` remains a real sudoers setting users may encounter.
- The PTY workaround showed `ssh_args = ... -tt`. I changed it to the documented `usetty = true` setting under `[ssh_connection]`, noting that the SSH connection plugin defaults it to true.
- The pipelining section implied pipelining fixes `requiretty`. I changed the wording to say pipelining can be enabled after disabling `requiretty`, matching Ansible's documented conflict between pipelining and sudo `requiretty`.
- The "Become User Does Not Exist" section used an error message that is actually about temporary-file permissions while becoming an unprivileged user. I renamed the section to "Become User Switch Fails" and kept the user-existence check as one diagnostic step.
- The debug command `sudo -u postgres whoami` combined with `--become` did not accurately test Ansible's own become-user path. I changed it to `ansible ... --become --become-user postgres`.
- The temporary-file section described the issue as restrictive temp directory permissions and called the setting world-executable directories. I changed it to describe Ansible's temporary module file readability problem and the documented world-readable temporary files setting.
- The pipelining advice for temporary files omitted Ansible's documented limitation for file-transfer and non-Python modules. I added a short note covering `copy`, `fetch`, `template`, and non-Python modules.
- The diagnostic playbook used `sudo -l`, which can block or fail when sudo requires a password. I changed it to `sudo -n -l` and added `ignore_errors: true` so it behaves as a diagnostic command.

## Review Notes
The post is technically relevant and accurate after the fixes. Future improvements could mention `ansible_common_remote_group` as another documented fallback for unprivileged become-user temporary file handling, but it was not necessary to correct the existing guidance.
