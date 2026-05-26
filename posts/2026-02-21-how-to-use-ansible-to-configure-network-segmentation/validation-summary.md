# Validation Summary: How to Use Ansible to Configure Network Segmentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.iptables
- ansible.builtin.command and ansible.builtin.shell
- community.general.modprobe
- iptables and iptables-save
- Netplan VLAN interfaces
- Network segmentation and firewall policy design

## Sources Consulted
- Ansible `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/iptables_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `community.general.modprobe` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/modprobe_module.html
- Netplan YAML configuration reference for VLANs: https://netplan.readthedocs.io/en/stable/netplan-yaml/

## Issues Found
- The `iptables-save > /etc/iptables/rules.v4` example used `ansible.builtin.command`, but Ansible's command module does not process shell metacharacters such as `>`. Changed it to `ansible.builtin.shell` so the redirection works.
- The audit playbook's `/dev/tcp` connectivity test used `ansible.builtin.command` with shell redirection. Changed it to `ansible.builtin.shell` so the shell expression is evaluated correctly.
- The database-tier outbound block task said it blocked both DMZ and app tier, but its loop only included the DMZ subnet. Added the app-tier subnet to match the stated behavior.

## Review Notes
- The examples are Linux-focused and assume iptables-style firewall management. On distributions that default to nftables, firewalld, or ufw, equivalent policy management may be preferable.
- The VLAN section references a `netplan-vlans.yaml.j2` template but does not include its contents. The Ansible task is syntactically valid, and Netplan's documented VLAN schema supports the modeled `id`, `link`, and address fields, but a production tutorial would benefit from showing the template.
