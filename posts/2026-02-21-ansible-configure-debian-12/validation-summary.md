# Validation Summary: How to Use Ansible to Configure Debian 12

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ansible
- Debian 12 Bookworm
- apt repositories and packages
- OpenSSH server configuration
- ifupdown networking
- chrony
- nftables
- sysctl
- systemd services

## Sources Consulted
- Debian Wiki: Firmware and the Debian 12 `non-free-firmware` component: https://wiki.debian.org/Firmware
- Debian Wiki: sudo installation behavior during Debian installs: https://wiki.debian.org/sudo
- Debian Wiki: Network configuration and ifupdown/NetworkManager behavior: https://wiki.debian.org/NetworkConfiguration
- Debian Wiki: nftables defaults and `/etc/nftables.conf`: https://wiki.debian.org/nftables
- Debian bookworm manpage: `sshd(8)`: https://manpages.debian.org/bookworm/openssh-server/sshd.8.en.html
- Debian bookworm manpage: `sshd_config(5)`: https://manpages.debian.org/bookworm/openssh-server/sshd_config.5.en.html
- Debian bookworm manpage: `chronyd(8)`: https://manpages.debian.org/bookworm/chrony/chronyd.8.en.html
- Ansible documentation: `ansible.builtin.apt`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: `ansible.builtin.user`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible documentation: `ansible.builtin.lineinfile`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: `ansible.builtin.systemd_service`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: `ansible.posix.authorized_key`: https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible documentation: `ansible.posix.sysctl`: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html

## Issues Found
- The post stated that sudo is absent by default. Debian's installer behavior is conditional: sudo is installed when the root password is left blank, and may be absent when a root password is configured. Updated the wording in the introduction and summary.
- The initial-access section implied fresh Debian 12 systems often have root SSH password access. Debian/OpenSSH defaults and provider images vary, so the statement was narrowed to systems or provider images where initial root access is available.
- The repository section said Debian 12 changed the repository format. The relevant Debian 12 change is the addition of the `non-free-firmware` archive component, not a required format change. Updated that wording.
- The admin user task set `groups: sudo` without `append: true`, which can remove other supplementary groups if the user already exists. Added `append: true`.
- The networking section described ifupdown as the universal Debian 12 default. This is true for common server/minimal installs but not always for desktop installs, which may use NetworkManager. Updated the statement to include that caveat.
- The playbook used `ansible.builtin.systemd`, which is now an alias of the recommended `ansible.builtin.systemd_service` module. Updated the service tasks and handlers to use `ansible.builtin.systemd_service`.
- The SSH handler used the `sshd` systemd unit name. Debian's OpenSSH server service is `ssh.service`, so the handler and notification were changed to `restart ssh` with `name: ssh`.
- The SSH configuration validation command used `sshd` without an absolute path. Updated it to `/usr/sbin/sshd -t -f %s`, which matches Debian's daemon location and avoids PATH issues during validation.

## Review Notes
- The `ansible.posix.authorized_key` and `ansible.posix.sysctl` modules require the `ansible.posix` collection. This may already be present when using the full `ansible` package, but it is not included in `ansible-core`.
- The `apt-transport-https` package is no longer generally required for HTTPS apt sources on modern Debian, but it remains installable and does not make the example invalid.
