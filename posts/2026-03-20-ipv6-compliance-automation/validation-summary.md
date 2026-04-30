# Validation Summary: How to Automate IPv6 Compliance Checks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6
- Python
- NAPALM
- Ansible
- Cisco IOS XR
- GitHub Actions

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- NAPALM `NetworkDriver` documentation: https://napalm.readthedocs.io/en/latest/base.html
- Ansible facts and variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `cisco.iosxr.iosxr_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/iosxr/iosxr_command_module.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- Cisco IOS XR access list command reference: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/ip-addresses/b-ip-addresses-cr-8k/access-list-commands.html
- Cisco IOS XR IPv6 interface command reference: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/b-setup-and-upgrade-cisco8k/setup-and-upgrade-commands.html

## Issues Found
- The Python `check_global_ipv6_present()` example was logically broken because `if not ipaddress.AddressValueError` filtered out every candidate address. I rewrote the sample to enumerate interfaces with `get_interfaces()`, read IPv6 data from `get_interfaces_ip()`, and use `IPv6Address.is_global` so the rule actually evaluates interfaces correctly.
- The loopback check only matched the string `::1` and ignored the `/128` prefix that NAPALM exposes through `prefix_length`. I updated the example to validate both the address and the prefix length.
- The policy text and playbook wording treated ICMPv6 too absolutely. RFC 4890 warns against both over-filtering and indiscriminate allowance, so I narrowed the rule to required ICMPv6 control traffic and adjusted the playbook example to flag broad deny rules instead of implying that all ICMPv6 filtering is invalid.
- The IPv6 ACL command in the Ansible playbook was incorrect for Cisco IOS XR. I changed `show ipv6 access-list` to `show access-lists ipv6` to match Cisco's documented command syntax.
- The playbook referenced `ansible_date_time` while `gather_facts` was disabled. I replaced that value with `now(utc=true, fmt='%Y-%m-%dT%H:%M:%SZ')`, which is the documented Ansible-safe approach when facts are not being gathered.
- The delegated `copy` task wrote to `reports/...` without first creating the parent directory. I added a `file` task because Ansible documents that `copy` does not create the parent directory when `dest` is a file path.
- The GitHub Actions cron comment did not specify that scheduled workflows run in UTC, and the workflow did not install the `cisco.iosxr` collection required by the `cisco.iosxr.iosxr_command` module. I corrected the comment and added the collection installation step.
- The policy item for IPv4-mapped IPv6 addresses referred to the routing table, which does not match RFC 4291's definition of IPv4-mapped IPv6 addresses. I changed the example rule to check for mapped addresses configured on interfaces instead.

## Review Notes
- On Cisco IOS XR, `show ipv6 interface brief` is a useful summary command, but Cisco notes that some IPv6-enabled interfaces may need additional commands such as `show ipv6 vrf all interface` when bundles or VRFs are involved. The post is valid as a lightweight audit example, but a production audit may need broader collection logic.
