# Validation Summary: How to Use Nornir for IPv6 Network Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Nornir
- Python
- IPv6
- NAPALM
- Netmiko
- YAML inventory files

## Sources Consulted
- Nornir documentation: Initializing Nornir: https://nornir.readthedocs.io/en/latest/tutorial/initializing_nornir.html
- Nornir documentation: Configuration: https://nornir.readthedocs.io/en/latest/configuration/
- Nornir documentation: Filtering Deep Dive: https://nornir.readthedocs.io/en/latest/howto/filtering_deep_dive.html
- Nornir documentation: Tasks: https://nornir.readthedocs.io/en/latest/tutorial/tasks.html
- Nornir documentation: Inventory API: https://nornir.readthedocs.io/en/latest/api/nornir/core/inventory.html
- nornir_napalm documentation: tasks API: https://nornir.tech/nornir_napalm/html/api/tasks.html
- nornir_utils documentation: functions API: https://nornir.tech/nornir_utils/html/api/functions.html
- nornir_netmiko official repository README: https://github.com/ktbyers/nornir_netmiko
- NAPALM documentation: NetworkDriver `get_interfaces_ip()`: https://napalm.readthedocs.io/en/latest/base.html
- Python documentation: `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The inventory example used invalid IPv6 literals (`2001:db8::r1`, `2001:db8::r2`, `2001:db8::r3`). I replaced them with valid documentation-prefix IPv6 addresses (`2001:db8::11`, `2001:db8::12`, `2001:db8::13`) because IPv6 literals must use hexadecimal digits.
- The installation command used package spellings that differ from the canonical names shown in the official plugin documentation. I updated the command to `pip install nornir nornir_napalm nornir_netmiko nornir_utils` to match the official package names.
- The post filtered devices into `ipv6_devices` but then continued to run tasks against `nr`, which made the example inconsistent. I changed the task execution examples to use `ipv6_devices` where the post says it is targeting IPv6-enabled devices.
- The group filter example used `nr.filter(groups=["core_routers"])`, which is not the documented current pattern for filtering hosts by parent group. I changed it to `ipv6_devices.filter(F(has_parent_group="core_routers"))` to match Nornir's documented filtering model.
- The compliance check claimed to detect link-local-only interfaces, but the original code flagged any interface that had a link-local address, even if it also had a non-link-local IPv6 address. I corrected the logic so it now flags only interfaces that have IPv6 addresses but no non-link-local address, and it also reports when a device has no non-link-local IPv6 addresses at all.
- The conclusion said Nornir maps IPv6 management addresses to hostnames. In the shown inventory, the host keys map hostnames to IPv6 management addresses, so I corrected that sentence.

## Review Notes
- The examples were reviewed against current documentation, but they were not executed against live network devices in this environment.
- The post uses `2001:db8::/32`, which RFC 3849 reserves for documentation. Because Python's `ipaddress.IPv6Address.is_global` reflects global reachability, the compliance example is more accurate when checking for non-link-local IPv6 addresses instead of globally reachable ones.
