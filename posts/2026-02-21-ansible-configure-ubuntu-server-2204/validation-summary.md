# Validation Summary: How to Use Ansible to Configure Ubuntu Server 22.04

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Ubuntu Server 22.04 LTS
- APT package management
- chrony time synchronization
- Linux user and sudo management
- OpenSSH server configuration
- UFW firewall configuration
- Linux sysctl and security limits
- unattended-upgrades

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ubuntu 22.04 LTS release notes: https://documentation.ubuntu.com/release-notes/22.04/
- Ubuntu Server time synchronization documentation: https://ubuntu.com/server/docs/explanation/networking/about-time-synchronisation/
- Ubuntu Jammy `sshd_config(5)` man page: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html

## Issues Found
- The post said Ubuntu 22.04 uses chrony for time synchronization. Official Ubuntu documentation indicates chrony becomes the default in later Ubuntu releases, while Ubuntu 24.04 and earlier commonly use `systemd-timesyncd` by default. Changed the wording to say the playbook installs and configures chrony.
- The SSH hardening task set `Protocol 2`. Ubuntu 22.04 ships OpenSSH 8.9, and the Jammy `sshd_config(5)` man page no longer documents `Protocol` as a valid server configuration keyword. Removed that loop item so `sshd -t -f %s` does not reject the generated configuration.
- The admin user variables used truncated SSH public keys containing ellipses, which are not valid public-key values for `ansible.posix.authorized_key`. Replaced them with Ansible `file` lookups so the playbook reads complete public keys from local files.

## Review Notes
- The playbook uses `community.general` and `ansible.posix` collection modules. These collections are included with the full `ansible` package but not necessarily with `ansible-core`, so a future revision could mention installing them with `ansible-galaxy collection install community.general ansible.posix`.
- The UFW example allows SSH on port 22 before enabling the firewall, which is correct for the shown inventory, but environments using a nonstandard SSH port should adjust the rule before applying the playbook.
