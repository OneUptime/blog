# Validation Summary: How to Configure IPv6 Firewall Rules with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- UFW
- ip6tables
- firewalld
- IPv6
- Linux firewall configuration

## Sources Consulted
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/iptables_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/12/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ad hoc command guide: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- UFW manual page: https://manpages.debian.org/trixie/ufw/ufw.8.en.html
- UFW framework manual page: https://manpages.debian.org/bookworm/ufw/ufw-framework.8.en.html
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage

## Issues Found
- The example IPv6 management prefix `2001:db8:management::/48` was not valid IPv6 syntax. I replaced it with the documentation-safe prefix `2001:db8:100::/48` in all three methods.
- The UFW example used `proto: ipv6` to represent ICMPv6. In UFW, `ipv6` refers to IPv6 encapsulation protocol 41, not ICMPv6. I removed that task and replaced it with a comment noting that UFW's default `before6.rules` already permit the ICMPv6 traffic required for IPv6 operation when IPv6 support is enabled.
- The UFW playbook notified a `Reload UFW` handler that was never defined. I removed the undefined notification because the final `state: enabled` task already reloads and enables UFW.
- The ip6tables save task used `ansible.builtin.command` with shell redirection (`>`), which the command module does not process. I changed it to `ansible.builtin.shell`.
- The firewalld example claimed to ensure firewalld was "installed and running" with only a service-management task. I split this into a package installation task and a service start/enable task.
- The firewalld rich-rule strings used ambiguous quoting and reused the invalid IPv6 prefix. I updated them to the documented rich-rule syntax using `family="ipv6"` style quoting and corrected the prefix.

## Review Notes
- `community.general.ufw` and `ansible.posix.firewalld` are collection modules, not part of `ansible-core`; the examples work as written when those collections are installed, which is typical with the full `ansible` package.
- `ansible.builtin.iptables` manages only the live in-memory ruleset; exporting rules to a file does not by itself guarantee boot-time persistence without OS-specific restore tooling.
- UFW already ships default IPv6 baseline rules in `before6.rules`, including the ICMPv6 traffic needed for core IPv6 functions such as stateless autoconfiguration and neighbor discovery.
