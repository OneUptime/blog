# Validation Summary: How to Use Ansible eos_config for IPv4 on Arista Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Arista EOS
- `arista.eos.eos_config`
- IPv4 interface configuration
- OSPFv2
- BGP

## Sources Consulted
- Ansible `arista.eos.eos_config` module docs: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_config_module.html
- Ansible EOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_eos.html
- Ansible facts and `ansible_date_time` docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `now()` templating docs: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html
- Arista EOS IPv4 docs: https://www.arista.com/en/um-eos/eos-ipv4
- Arista EOS VLAN docs: https://www.arista.com/en/um-eos/eos-virtual-lans-vlans
- Arista EOS OSPFv2 docs: https://www.arista.com/en/um-eos/eos-open-shortest-path-first-version-2
- Arista EOS BGP docs: https://www.arista.com/en/um-eos/eos-border-gateway-protocol-bgp
- Arista EOS interface/routed-port docs: https://www.arista.com/en/um-eos/eos-data-transfer

## Issues Found
- The inventory used legacy short values for the platform and connection plugin. I changed `ansible_network_os=eos` to `ansible_network_os=arista.eos.eos` and `ansible_connection=network_cli` to `ansible_connection=ansible.netcommon.network_cli` to match the current official EOS platform documentation.
- EOS disables IPv4 routing by default. I added an `ip routing` task so the routed interface, OSPF, and BGP examples work as described.
- The SVI example configured `interface Vlan10` but did not create VLAN 10. I added a `vlan 10` task so the VLAN/SVI example is consistent with EOS VLAN interface behavior.
- The BGP example advertised `10.1.0.0/16`, but the playbook only configured `10.1.10.0/24` as a connected IPv4 network. I changed the BGP `network` statement to `10.1.10.0/24` so it matches the route the example actually creates.
- The backup filename used `{{ ansible_date_time.date }}` while the play has `gather_facts: false`. I replaced it with `{{ now(utc=true, fmt='%Y-%m-%d') }}`, which does not depend on gathered facts, and removed the unnecessary empty `lines` list from the backup task.
- The backup task name and conclusion described the backup/save behavior imprecisely. I changed the task name from “Backup before change” to “Backup current running config” and updated the conclusion to describe `save_when: modified` as copying running-config to startup-config, which matches the module documentation.

## Review Notes
- The post is technically valid after the fixes above.
- The example uses CLI over SSH, but `arista.eos.eos_config` also supports eAPI via `ansible.netcommon.httpapi`.
- If the target switch requires a separate enable password, the inventory may also need `ansible_become_password` or the playbook can be run with `--ask-become-pass`.
