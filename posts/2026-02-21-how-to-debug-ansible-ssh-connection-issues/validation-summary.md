# Validation Summary: How to Debug Ansible SSH Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ansible ad hoc commands and SSH connection settings
- OpenSSH client and server configuration
- Linux networking and firewall troubleshooting commands
- Linux systemd service checks
- Bash scripting

## Sources Consulted
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible inventory guide and behavioral inventory parameters: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible interpreter discovery documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible-core/2.15/collections/ansible/builtin/ssh_connection.html
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config
- Local OpenSSH 9.6p1 client help and man pages for SSH option behavior

## Issues Found
- The post said Ansible supports four verbosity levels. Current Ansible documentation says multiple `-v` flags are supported and built-in plugins currently evaluate up to `-vvvvvv`; I changed the wording to avoid an inaccurate fixed limit while keeping the practical `-v` through `-vvvv` examples.
- The "Connection refused" section only used `systemctl status sshd`. That is correct on many distributions, but Debian/Ubuntu commonly use the `ssh` service name. I added the alternate `systemctl status ssh` command.
- The Python interpreter section implied modern Ansible always expects `/usr/bin/python`. Current Ansible performs interpreter discovery by default unless configured otherwise. I updated the example and explanation to describe discovery failures or an explicitly wrong configured path.
- The `MaxSessions` note said it "must be high enough for multiplexing." OpenSSH documents this as the maximum number of open sessions per network connection. I adjusted the wording to say to increase it when multiplexed connections need more sessions.
- The checklist and debug script used `ansible TARGET_HOST ...` and `ansible "$HOST" ...` without providing an inline inventory. Those commands only work if the host is already present in inventory. I added `-i TARGET_HOST,` and `-i "$HOST,"` where the post is testing a direct host value.

## Review Notes
The remaining commands and configuration examples are technically plausible for common Linux/OpenSSH/Ansible environments, but some are distribution-specific: SSH logs may be in journald instead of `/var/log/auth.log` or `/var/log/secure`, and TCP wrappers files may not affect modern OpenSSH builds on many distributions.
