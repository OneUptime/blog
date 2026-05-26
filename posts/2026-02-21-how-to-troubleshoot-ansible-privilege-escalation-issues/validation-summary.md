# Validation Summary: How to Troubleshoot Ansible Privilege Escalation Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible ad hoc commands and playbooks
- Ansible privilege escalation (`become`)
- The `ansible.builtin.sudo` become plugin
- SSH connection configuration
- Linux `sudo` and sudoers configuration
- YAML playbook snippets

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible `ansible.builtin.sudo` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- sudoers manual: https://www.sudo.ws/docs/man/1.9.14/sudoers.man/

## Issues Found
- The command for checking the remote sudo prompt used Bash here-string syntax inside an SSH command and set `SUDO_PROMPT`, which would force a prompt instead of showing the host's real prompt. Changed it to `ssh -tt deploy@192.168.1.10 "sudo -k; sudo -v"` so sudo displays the actual prompt through an allocated TTY.
- The verbose Ansible sudo command example showed `echo BECOME-SUCCESS` before `sudo`, which would not prove privilege escalation succeeded. Updated the example so sudo runs a shell that emits `BECOME-SUCCESS` after escalation, matching Ansible's observed command structure.
- The pipelining section implied sudo prompt detection is a typical pipelining symptom. Adjusted the wording to focus on `requiretty` and sudo configurations that conflict with pipelined module execution, as documented by Ansible.
- The quick reference mapped timeout and permission-denied errors too narrowly. Updated those mappings to include blocked sudo execution, become scope, and target permissions.

## Review Notes
The local environment did not have the `ansible` executable installed, so CLI flags and configuration keys were validated against current official Ansible documentation rather than local `--help` output. The post uses broad troubleshooting examples without pinning an Ansible version; reviewed against current Ansible community documentation as of 2026-05-26.
