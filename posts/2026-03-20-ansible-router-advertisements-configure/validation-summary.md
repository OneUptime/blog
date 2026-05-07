# Validation Summary: How to Configure Router Advertisements with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- `radvd`
- IPv6 Neighbor Discovery
- Router Advertisements
- SLAAC
- DHCPv6

## Sources Consulted
- Ansible `template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible ad hoc commands documentation: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- `radvd` official repository and manpage source: https://github.com/radvd-project/radvd
- `radvd.conf(5)` current packaged manpage: https://manpages.ubuntu.com/manpages/noble/man5/radvd.conf.5.html
- `radvd(8)` current packaged manpage: https://manpages.ubuntu.com/manpages/noble/man8/radvd.8.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- Red Hat Enterprise Linux 10, Managing networking infrastructure services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_networking_infrastructure_services/managing_networking_infrastructure_services

## Issues Found
- The `ansible.posix.sysctl` task only persisted the forwarding setting to a sysctl file and reloaded it when that file changed. I added `sysctl_set: true` so the task also enforces the live kernel value, matching the post's claim that it enables IPv6 forwarding.
- The post described `AdvManagedFlag` and `AdvOtherConfigFlag` as if they directly forced clients to use DHCPv6. I corrected the wording to match RFC 4861 and `radvd` documentation: these flags advertise DHCPv6-managed address availability and other DHCPv6 configuration availability.
- The verification comment said the `ip -6 addr` command checked for an “RA-derived” address, but that command only confirms a global IPv6 address is present. I adjusted the wording to match what the command actually verifies.
- The forwarding task comment said IPv6 forwarding was required for `radvd` to send RAs. Current `radvd` behavior only warns when forwarding is disabled and continues, but forwarding is required when the host is actually serving as an IPv6 router. I corrected the task description accordingly.

## Review Notes
- The post's `radvd` configuration syntax, including `RDNSS`, `DNSSL`, `AdvDefaultLifetime`, and the prefix block structure, is consistent with current `radvd` documentation.
- The example uses a `/64` advertised prefix, which is the correct choice for SLAAC-based client address configuration.
- The guide assumes the `ansible.posix` collection is available. That is valid for many Ansible installations, but users running only `ansible-core` would need to install the collection separately.
