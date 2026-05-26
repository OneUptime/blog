# Validation Summary: How to Debug Ansible SSH Connection Failures

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible ad-hoc commands and SSH connection plugin
- OpenSSH client configuration and command-line options
- SSH key authentication and known_hosts management
- DNS and network connectivity troubleshooting commands
- Bastion / jump host SSH configuration

## Sources Consulted
- Ansible latest `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible latest `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible latest configuration file documentation: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible connection methods and details documentation: https://docs.ansible.com/projects/ansible/2.9/user_guide/connection_details.html
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `ssh-keygen(1)` manual: https://man.openbsd.org/ssh-keygen
- Local OpenSSH client help/output from `ssh -V`, `ssh -G`, `ssh-keygen -R`, and `ssh-keyscan` usage

## Issues Found
- The post described `-vvvv` as "maximum verbosity." Current Ansible CLI documentation says verbosity can go beyond `-vvvv`, while `-vvvv` is appropriate for connection debugging. Updated the heading and wording to describe it as connection debugging verbosity.
- The `ansible.cfg` timeout example used an inline `#` comment after a value. Ansible's configuration documentation states that inline comments in regular values must use semicolons, while `#` is only valid when starting a comment line. Moved the comment to its own line.
- The introduction and summary used absolute phrasing ("every common SSH failure scenario" and "always"). Tightened these to "common" and "usually" because Ansible SSH failures can also involve environment-specific issues not covered by the listed categories.

## Review Notes
The remaining commands, inventory variables, SSH options, and configuration keys were consistent with the consulted Ansible and OpenSSH documentation. Some network tools shown (`dig`, `nslookup`, `nc`, `nmap`, `traceroute`) may need separate packages depending on the operating system, but the command usage is technically valid.
