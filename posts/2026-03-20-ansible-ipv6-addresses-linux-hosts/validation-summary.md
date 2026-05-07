# Validation Summary: How to Configure IPv6 Addresses on Linux Hosts with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- `community.general.nmcli`
- Netplan
- Linux networking
- IPv6
- `iproute2`

## Sources Consulted
- Ansible `community.general.nmcli` module docs: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- Ansible `ansible.builtin.command` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible.builtin.include_tasks` docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible search path docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan `apply` command docs: https://netplan.readthedocs.io/en/0.107/netplan-apply/
- Local `iproute2` CLI help: `ip -6 address help` and `ip -6 route help`

## Issues Found
- The role tree did not match the files used in the examples. I updated the structure so it reflects the task files and template file actually referenced in the post.
- The `community.general.nmcli` example used `notify` without defining any handler. I replaced that with a direct activation step using `state: up`, gated on task changes and skipped during check mode.
- The Netplan task also used `notify` without defining a handler, and its template `src` would not resolve correctly when the task file is brought in with `include_tasks`. I changed the template path to an explicit role-relative path and added a direct `netplan apply` step that only runs when the template changed.
- The Netplan static IPv6 example did not explicitly disable DHCPv6 or router advertisements. I added `dhcp6: false` and `accept-ra: false` so the snippet matches the stated static configuration intent.
- The temporary `ip` command example always reported changes and hid failures with `ignore_errors`. I changed it to check current address and route state first, then add or replace only when needed.
- The playbook’s verification steps still ran during `--check`, which makes the dry-run guidance incorrect. I skipped the verification and assertion tasks in check mode.
- The post used `community.general.nmcli` without noting that it is not part of `ansible-core`. I added the required collection install command.

## Review Notes
- The examples still assume `ansible_default_ipv4.interface` is available. That is reasonable for the sample inventory in the post, but an explicit interface variable would be more robust for IPv6-only hosts.
