# Validation Summary: How to Automate IPv6 Security Hardening with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks and modules
- Linux IPv6 `sysctl` hardening
- `ip6tables` firewall rules
- ICMPv6 and Neighbor Discovery
- DHCPv6

## Sources Consulted
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/iptables_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html

## Issues Found
- The SLAAC hardening snippet disabled `autoconf` while also enabling `use_tempaddr`. Temporary privacy addresses apply to autoconfigured IPv6 addresses, so those `use_tempaddr` settings were removed to eliminate the contradiction.
- The ICMPv6 allowlist was labeled as the RFC 4890 "required types only" set, but it omitted MLD control traffic and allowed Redirect messages even though RFC 4890 treats Redirect as an explicit policy decision. The rule name was corrected, MLD types were added, and Redirect was removed from the blanket allowlist.
- The DHCPv6 blocking rule matched only destination port `546` plus a link-local source range. RFC 8415 defines clients as listening on UDP port `546` and servers/relays on UDP port `547`, so the rule was corrected to match `547 -> 546`.
- The firewall example flushed all chains but did not explicitly set an `OUTPUT` policy, making the end state dependent on previous firewall state. An explicit `OUTPUT` policy of `ACCEPT` was added so the baseline is deterministic.
- The rules export task used `ansible.builtin.command` with shell redirection, which Ansible documents as a shell use case. It was changed to `ansible.builtin.shell`, and the task wording was corrected from "persistently" to exporting rules to a file because boot-time restore is distro-specific.

## Review Notes
- `ansible.posix.sysctl` is part of the `ansible.posix` collection rather than `ansible-core`, so the collection must be available on the control node.
- The firewall example is still a baseline. Operators need to add explicit allow rules for required IPv6 services such as SSH or application listeners before applying it to production hosts.
- Writing `/etc/ip6tables.rules` does not by itself guarantee restore on reboot; each distribution uses its own persistence mechanism or service for loading saved rules.
