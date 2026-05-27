# Validation Summary: How to Use Ansible to Configure WireGuard VPN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and modules
- WireGuard VPN
- wg and wg-quick command-line tools
- Linux systemd services
- Linux sysctl IP forwarding
- UFW firewall rules
- iptables NAT rules
- YAML inventory and Jinja2 templates

## Sources Consulted
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- WireGuard Installation: https://www.wireguard.com/install/
- WireGuard wg(8) manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- WireGuard wg-quick(8) manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- WireGuard Protocol and Cryptography: https://www.wireguard.com/protocol/
- Ansible ansible.builtin.apt module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.dnf module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible ansible.builtin.command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.systemd_service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.posix.sysctl module: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible community.general.ufw module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html

## Issues Found
- The prerequisites said Ansible 2.9+, but the post uses collection-qualified modules such as `ansible.posix.sysctl` and `community.general.ufw`. Updated the prerequisite to Ansible 2.10+ with the required collections installed.
- The Red Hat-family installation task used `ansible.builtin.yum` and implied generic RHEL/CentOS 8+ WireGuard support. Updated it to `ansible.builtin.dnf` and clarified that the task installs `wireguard-tools` on Red Hat-family hosts that already have WireGuard kernel support.
- The public-key generation task used `ansible.builtin.shell` with a pipe. Replaced it with `ansible.builtin.command` and `stdin`, matching Ansible guidance to avoid shell when shell features are not needed.
- The playbooks used `ansible.builtin.systemd`, which is now documented as a redirect to `ansible.builtin.systemd_service`. Updated the snippets to the current module name.
- The dynamic peer-management example saved the runtime config before the optional peer removal, so removals would not be persisted. Moved `wg-quick save` after the optional removal task.

## Review Notes
- The WireGuard configuration keys shown (`Address`, `ListenPort`, `PrivateKey`, `PublicKey`, `AllowedIPs`, `Endpoint`, `PersistentKeepalive`, `DNS`, `PostUp`, and `PostDown`) match the `wg` and `wg-quick` documented formats.
- The local environment did not have `ansible` or `wg` installed, so validation was performed against official documentation rather than by executing the playbooks.
