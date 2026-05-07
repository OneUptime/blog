# Validation Summary: How to Configure IPv6 SLAAC Settings with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- IPv6
- SLAAC
- Linux `sysctl`
- `iproute2`

## Sources Consulted
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Linux kernel IP sysctl documentation (current series for `addr_gen_mode` details): https://docs.kernel.org/6.18/networking/ip-sysctl.html
- `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- Local `sysctl --help` output from the installed `sysctl` CLI

## Issues Found
- The sysctl table listed numeric defaults that were not technically accurate across Linux forwarding modes. I updated the defaults and descriptions for `accept_ra`, `autoconf`, `use_tempaddr`, and `addr_gen_mode` to match Linux kernel documentation.
- The client playbook hardcoded `net.ipv6.conf.eth0.accept_ra`, which is not portable and is unnecessary because `conf.all` and `conf.default` already cover current and future interfaces. I removed the hardcoded interface line.
- The server/router explanation stated that routed hosts should not use SLAAC and need static IPv6 addresses. I corrected this to the narrower, accurate claim that statically addressed servers and routers often disable SLAAC.
- The verification playbook checked only for any global IPv6 address on `ansible_default_ipv4.interface`, which could target the wrong interface and did not specifically validate SLAAC. I changed it to `ip -6 addr show scope global dynamic` and asserted that the output is non-empty, matching iproute2's documented filter for statelessly configured IPv6 addresses.

## Review Notes
- The client example keeps `accept_ra=1`, which is appropriate for non-forwarding hosts. On Linux systems with IPv6 forwarding enabled, Router Advertisements are ignored unless `accept_ra=2`.
