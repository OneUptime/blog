# Validation Summary: How to Automate IPv6 ACL Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6 ACLs
- Cisco IOS XR
- Ansible
- Jinja2 templating
- Python
- OpenSSH

## Sources Consulted
- Ansible `cisco.iosxr.iosxr_config` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/iosxr/iosxr_config_module.html
- Ansible `cisco.iosxr.iosxr_command` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/iosxr/iosxr_command_module.html
- Ansible `ansible.builtin.include_vars` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible `ansible.builtin.template` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible check mode and diff mode docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible IOS-XR platform options: https://docs.ansible.com/ansible/latest/network/user_guide/platform_iosxr.html
- Python `ipaddress` library docs: https://docs.python.org/3/library/ipaddress.html
- RFC 3849 IPv6 documentation prefix: https://datatracker.ietf.org/doc/rfc3849/
- Cisco IOS XR access list command reference: https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5000/ip-addresses/b-ip-addresses-cr-ncs5000/access-list-commands.html
- Cisco IOS XR access list command reference: https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/ip-addresses/b-ip-addresses-cr-ncs5500/access-list-commands.html
- Local CLI verification with `ssh -G` on OpenSSH 9.6p1 and `python --version` / `python3 --version`

## Issues Found
- The example IPv6 prefixes used `trusted` and `servers`, which are not valid hexadecimal IPv6 hextets. I replaced them with valid RFC 3849 documentation prefixes: `2001:db8:100::/48` and `2001:db8:200::/48`.
- The final deny rule was labeled as an “implicit deny all”, but it was actually an explicit `deny ipv6 any any log` entry. I corrected the remark to “Explicit deny all with logging” to match IOS XR ACL behavior.
- The playbook paths for `policy_file` and the Jinja2 template did not match the documented file layout. I corrected them to `../policies/...` and `../templates/...` so the files resolve correctly from `playbooks/deploy_ipv6_acl.yml`.
- The `cisco.iosxr.iosxr_config` example mixed `src` with `lines` and `parents`, which the module documentation marks as mutually exclusive. I removed the conflicting arguments and left `src` as the sole configuration source.
- The verification command used `show ipv6 access-list`, which is IOS syntax, not the documented IOS XR form. I corrected both verification examples to `show access-lists ipv6 ...`.
- The dry-run instructions (`--check --diff`) conflicted with the post-deploy verification tasks. I skipped verification during `ansible_check_mode` and forced the local template render to run so the simulated config load still has a source file.
- The validation command used `python`, which is not guaranteed to exist on current Linux systems and was absent in the local environment. I changed it to `python3`.

## Review Notes
- Ansible was not installed in the local workspace, so the playbook review was documentation-based rather than execution-based.
- The examples assume the `cisco.iosxr` Ansible collection and the PyYAML package are already installed.
- The `permit icmpv6 any any` example is technically valid for IOS XR, but it is broader than the minimum ICMPv6 allowances often used in production ACLs.
