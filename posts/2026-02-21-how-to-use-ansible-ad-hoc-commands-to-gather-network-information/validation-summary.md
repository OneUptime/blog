# Validation Summary: How to Use Ansible Ad Hoc Commands to Gather Network Information

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- Ansible setup facts
- Ansible command, shell, and uri modules
- Linux networking commands: ip, route, ping, dig, getent, nc, ss, ethtool, iptables, firewalld, nftables
- Docker networking
- iperf3 throughput testing

## Sources Consulted
- Ansible ad hoc commands documentation: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Local command help for iproute2 `ip route`, `ip link`, `ip neigh`, and `ip netns`
- Local command help for `ping`, `dig`, `nc`, `nft`, and `ss`

## Issues Found
- The command for collecting all network-related Ansible facts used `filter=ansible_*net*`. Ansible's `filter` option only filters first-level keys under `ansible_facts`, so that pattern would miss important network facts such as `ansible_interfaces`, `ansible_default_ipv4`, and `ansible_all_ipv4_addresses`. Changed it to `gather_subset=!all,!min,network`, which uses the documented `network` fact subset.

## Review Notes
Most commands are Linux/POSIX focused and assume common tools are installed on the managed hosts. Some commands, such as `dig`, `nc`, `ethtool`, `firewall-cmd`, `nft`, Docker, and `iperf3`, may require packages that are not present by default on every distribution. The examples are otherwise technically valid for typical Linux targets.
