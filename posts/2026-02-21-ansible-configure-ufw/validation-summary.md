# Validation Summary: How to Use Ansible to Configure UFW Firewall

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general.ufw Ansible module
- ansible.builtin.wait_for Ansible module
- UFW
- Ubuntu
- Debian
- YAML

## Sources Consulted
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ubuntu Server firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Ubuntu security firewall documentation: https://documentation.ubuntu.com/security/security-features/network/firewall/
- Debian Firewall documentation: https://wiki.debian.org/DebianFirewall
- Debian UFW documentation: https://wiki.debian.org/Uncomplicated_Firewall_%28ufw%29
- Debian `ufw(8)` man page: https://manpages.debian.org/trixie/ufw/ufw.8.en.html

## Issues Found
- The introduction said UFW is the default firewall management tool on both Ubuntu and Debian. Ubuntu documents UFW as its default firewall configuration tool, but Debian documents iptables/nftables-level tooling by default and UFW as an optional high-level tool. The wording now says UFW is default on Ubuntu and available on Debian.
- The introduction described UFW only as an iptables frontend. Current Ubuntu documentation notes UFW can work as a frontend for iptables and nftables, so the wording now references iptables/nftables and low-level firewall syntax.
- The global rules included `proto: icmp`. The current `community.general.ufw` module's supported `proto` choices do not include `icmp`, so that rule would fail validation. The invalid ICMP rule was removed.
- The local subnet examples used `{{ ansible_default_ipv4.network }}/{{ ansible_default_ipv4.netmask }}`. The fact value for `netmask` is dotted decimal, while UFW examples and Ansible facts expose `prefix` for CIDR notation. The examples now use `{{ ansible_default_ipv4.network }}/{{ ansible_default_ipv4.prefix }}`.
- The SSH rate limit task was appended after broader SSH allow rules and did not support `from_ip`, making the documented "from allowed subnets" behavior unreliable. The rate-limit rules now carry `from_ip` and are applied before broader allow rules for the same port.
- The running instructions used `-e "ufw_reset=true"`, but the shown `site.yml` did not consume `ufw_reset`. The playbook now includes a conditional `pre_tasks` reset so that command works as documented.

## Review Notes
The connectivity test confirms blocked database access by expecting `wait_for` failures from the controller's network path. That is technically valid for the shown scenario, but real environments should also test from allowed source subnets to verify positive database access.
