# Validation Summary: How to Use Ansible vyos_config for IPv4 on VyOS Routers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- VyOS
- IPv4 routing
- Source NAT
- OSPF
- Network automation

## Sources Consulted
- Ansible `vyos.vyos.vyos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vyos/vyos/vyos_config_module.html
- Ansible VyOS platform options documentation: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_vyos.html
- VyOS Quick Start (current): https://docs.vyos.io/en/latest/quick-start.html
- VyOS NAT44 documentation (current): https://docs.vyos.io/en/latest/configuration/nat/nat44.html
- VyOS IPv4 firewall documentation (current): https://docs.vyos.io/en/latest/configuration/firewall/ipv4.html
- VyOS OSPF documentation (current): https://docs.vyos.io/en/latest/configuration/protocols/ospf.html
- VyOS CLI documentation (current): https://docs.vyos.io/en/latest/cli.html
- Official `vyos.vyos` collection source for `vyos_config`: https://github.com/vyos/vyos.vyos/blob/main/plugins/modules/vyos_config.py

## Issues Found
- The inventory used outdated connection settings. I changed `ansible_network_os=vyos` to `ansible_network_os=vyos.vyos.vyos` and `ansible_connection=network_cli` to `ansible_connection=ansible.netcommon.network_cli` to match current Ansible VyOS platform documentation.
- The NAT example used older outbound-interface syntax. I changed `set nat source rule 100 outbound-interface 'eth0'` to `set nat source rule 100 outbound-interface name 'eth0'` to match current VyOS NAT44 documentation.
- The firewall section used older rule syntax and interface attachment style. I updated it to current IPv4 firewall commands using `set firewall ipv4 ...` and a `forward filter` jump rule, which matches the current VyOS firewall documentation.
- The save example used `save: yes`. I changed it to `save: true` to align with current Ansible documentation style while preserving the same behavior.
- The conclusion overstated check mode with the claim "Check mode works fully with VyOS." I replaced that with a documented claim that the module supports check mode and `--check --diff` can be used to preview changes.

## Review Notes
- VyOS firewall syntax is version-sensitive. Current VyOS 1.4/1.5 documentation centers on the newer `firewall ipv4`/`firewall ipv6` structure, so the post was updated to that syntax instead of older legacy examples.
- The `vyos_config` module source confirms `supports_check_mode=True` and shows that commits are skipped in check mode while diffs can still be prepared.
- Examples were documentation-verified during review, but not executed against a live VyOS router in this workspace.
