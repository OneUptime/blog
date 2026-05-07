# Validation Summary: How to Automate IPv6 BGP Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BGP / MP-BGP
- Cisco IOS XR
- Ansible
- Jinja2
- Python
- Netmiko
- YAML inventory

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- Ansible IOS-XR platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_iosxr.html
- `cisco.iosxr.iosxr_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/iosxr/iosxr_command_module.html
- `cisco.iosxr.iosxr_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/iosxr/iosxr_config_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Cisco IOS XR BGP soft reconfiguration documentation: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/bgp/bgp-config-cisco8000/r-wrapper-bgp-neighbor-and-session-configuration/c-soft-reconfiguration.html
- Cisco IOS XR BGP configuration guide (`show bgp {ipv4 | ipv6} unicast neighbor ip-address` verification workflow): https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/bgp/72x/b-bgp-cg-8k-72x/implementing-bgp.html
- Cisco IOS XR BGP command reference (`show bgp neighbors` output and `BGP state = Established`): https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/bgp/cumulative/command/reference/b-bgp-cr-cisco8000/m-bgp-commands-8k.html
- Netmiko supported platforms: https://ktbyers.github.io/netmiko/PLATFORMS.html
- Netmiko API documentation: https://ktbyers.github.io/netmiko/docs/netmiko/

## Issues Found
- The inventory used invalid IPv6 literals such as `2001:db8::r1` and `2001:db8::peer1`. IPv6 addresses must use hexadecimal fields, so these were replaced with valid documentation addresses from `2001:db8::/32`.
- The inventory omitted `ansible_connection` and `ansible_network_os`, even though the playbook and IOS-XR network modules depend on them. These variables were added under `all.vars`.
- The Jinja2 template derived the advertised prefix from `inventory_hostname[-1]`, which is not a reliable way to build IPv6 prefixes. This was replaced with explicit `bgp_networks` data in the inventory and a corresponding loop in the template.
- The playbook verification logic only checked whether a peer IP appeared in `show bgp ipv6 unicast summary`, which does not prove the session is established, and it would also have run during `--check`. This was replaced with per-peer `show bgp ipv6 unicast neighbors ...` checks, `wait_for` validation against `BGP state = Established`, and a guard to skip live verification in check mode.
- The Python checker used the unsupported Netmiko device type `cisco_iosxr`. Netmiko currently documents `cisco_xr`, so the script was corrected.
- The Python checker tried to infer established state from summary output by searching for the word `Established`, but IOS XR summary output uses the `St/PfxRcd` column instead of printing that string for established sessions. The script now checks each neighbor directly with `show bgp ipv6 unicast neighbors ...`.
- The verification command used `python`, which is not consistently present on modern systems. It was updated to `python3`.
- The post referenced route-policy names without noting the prerequisite that those policies must already exist on IOS XR. A short clarification was added to prevent failed commits.

## Review Notes
- The `network` statements in the template are syntactically valid, but BGP only advertises prefixes that already exist in the IPv6 unicast routing table. The example assumes those routes already exist on the routers.
- `ansible-playbook` was not installed in the local workspace, so the CLI flags were validated against official Ansible documentation rather than local `--help` output.
