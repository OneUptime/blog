# Validation Summary: How to Use Ansible to Configure Ubuntu Server 24.04

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ubuntu Server 24.04 LTS
- Netplan
- systemd-resolved
- AppArmor
- needrestart
- sysctl
- OpenSSH
- UFW

## Sources Consulted
- Ubuntu 24.04 LTS release notes: https://documentation.ubuntu.com/release-notes/24.04/
- Ubuntu Server documentation, About Netplan: https://ubuntu.com/server/docs/explanation/networking/about-netplan/
- Ubuntu Server documentation, Configuring networks: https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- cloud-init network configuration documentation: https://docs.cloud-init.io/en/latest/topics/network-config.html
- Netplan 24.04 man page: https://manpages.ubuntu.com/manpages/noble/man5/netplan.5.html
- systemd-resolved resolved.conf 24.04 man page: https://manpages.ubuntu.com/manpages/noble/man5/resolved.conf.5.html
- AppArmor aa-status 24.04 man page: https://manpages.ubuntu.com/manpages/noble/man8/aa-status.8.html
- AppArmor aa-enforce 24.04 man page: https://manpages.ubuntu.com/manpages/noble/man8/aa-enforce.8.html
- Ubuntu Community Hub, needrestart changes in Ubuntu 24.04: https://discourse.ubuntu.com/t/needrestart-changes-in-ubuntu-24-04-service-restarts/44671
- Ubuntu Server documentation, OpenSSH server: https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html

## Issues Found
- The introduction and summary described Netplan as a network manager and, later, as the sole network manager. Netplan is a network configuration abstraction that renders to backends such as systemd-networkd or NetworkManager, so the wording was corrected.
- The Netplan example removed `/etc/netplan/50-cloud-init.yaml` without disabling cloud-init networking. cloud-init documents `network: config: disabled` in `/etc/cloud/cloud.cfg.d/*` as the supported cloud-config method, so the playbook now checks for the cloud-init config directory, writes a disable file when present, and then removes the generated Netplan file.
- The systemd-resolved template emitted repeated `DNS=` and `Domains=` lines. systemd's `resolved.conf` documents these as space-separated lists, so the template now renders each setting as a single joined line.
- The AppArmor status example used `apparmor_status --json`. The Ubuntu 24.04 man page documents `aa-status --json`, so the command was updated to the documented interface.
- The `aa-enforce` example passed profile file paths under `/etc/apparmor.d/`. The Ubuntu 24.04 man page documents executable arguments with `/etc/apparmor.d` as the default profile directory, so the example now passes executable paths.
- The needrestart section said Ubuntu 24.04 prompts for service restarts after package updates. Ubuntu documents that 24.04 server images run needrestart after APT transactions and directly restart affected services by default, so the explanation was corrected while keeping the explicit automatic restart configuration.
- The firewall section was titled "Firewall with nftables" but used the `community.general.ufw` module. The heading and lead-in were corrected to UFW.

## Review Notes
- The playbook uses `community.general` and `ansible.posix` modules; users running only `ansible-core` must install those collections.
- The Netplan example derives a static configuration from the current default IPv4 facts. This is valid as an example, but production roles should usually template explicit interface, address, prefix, and gateway variables to avoid locking in transient facts.
