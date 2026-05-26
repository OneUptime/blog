# Validation Summary: How to Use the Ansible iptables Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.iptables
- Linux iptables/netfilter
- Firewall rules
- NAT and port forwarding
- iptables persistence with netfilter-persistent and service iptables save

## Sources Consulted
- Ansible Core documentation for ansible.builtin.iptables: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/iptables_module.html
- Ansible ansible.builtin.iptables module source: https://raw.githubusercontent.com/ansible/ansible/stable-2.17/lib/ansible/modules/iptables.py
- Netfilter/iptables project overview: https://www.iptables.org/
- Debian iptables-extensions man page: https://manpages.debian.org/unstable/iptables/iptables-extensions.8.en.html
- Local iptables v1.8.10 command help and iptables-translate validation output

## Issues Found
- The first `destination_ports` example used a scalar string. The official Ansible module documentation defines `destination_ports` as a list of strings, so I changed it to a one-item list containing `"8000:8010"`.
- The port range examples explicitly set `match: multiport`. Current Ansible automatically adds the `multiport` match when `destination_ports` is used. Keeping `match: multiport` causes Ansible to generate an invalid duplicated multiport match sequence, so I removed the explicit `match` lines.

## Review Notes
The post is technically valid after the fixes. The `ansible.builtin.iptables` module only manipulates in-memory rules; the post correctly notes that rules must be saved separately for persistence. Future revisions could call out that `destination_ports` requires ansible-core 2.11 or newer and that `netfilter-persistent save` is Debian/Ubuntu-specific.
