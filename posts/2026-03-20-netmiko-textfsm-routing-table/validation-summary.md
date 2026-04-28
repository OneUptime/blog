# Validation Summary: How to Retrieve and Parse IPv4 Routing Tables with Netmiko and TextFSM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Netmiko (Python SSH library for network devices)
- TextFSM (template-based text parsing)
- ntc-templates (Cisco TextFSM template library)
- Python 3 (`ipaddress`, `concurrent.futures`, `json`, `datetime`)
- Cisco IOS / IOS XE (`show ip route`, `show hostname`)

## Sources Consulted
- Netmiko documentation: https://github.com/ktbyers/netmiko
- Netmiko `send_command` API and `use_textfsm` parameter docs
- ntc-templates repository: https://github.com/networktocode/ntc-templates (specifically `cisco_ios_show_ip_route.textfsm`)
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html (`subnet_of` available since 3.7)
- Python `concurrent.futures.ThreadPoolExecutor` documentation
- Cisco IOS routing table protocol code reference (`B`, `O`, `S`, `C`, etc.)

## Issues Found
No technical issues found.

Verified specifics:
- `use_textfsm=True` is a valid `send_command` keyword argument that returns a list of dicts when parsing succeeds and a string when it fails — matching the `isinstance(routes, list)` checks throughout.
- Field names used (`protocol`, `network`, `mask`, `nexthop_ip`) match the lowercased Value fields produced by the `cisco_ios_show_ip_route` ntc-templates template.
- Protocol codes (`B` BGP, `O` OSPF, `S` Static, `C` Connected) match Cisco IOS conventions.
- `ip_network(...).subnet_of(...)` is correct Python 3.7+ API.
- Netmiko supports `ConnectHandler` as a context manager and `conn.enable()` to elevate privilege.
- `ThreadPoolExecutor` + `executor.map(...)` correctly produces ordered `(host, routes)` tuples consumable by `dict(...)`.

## Review Notes
- `show hostname` is available on Cisco IOS XE 16.x and later, but not on older Cisco IOS (12.x/15.x) releases. For broader compatibility, readers using legacy IOS could substitute `show running-config | include ^hostname` or use `conn.find_prompt().rstrip('#> ')`. This is a portability caveat rather than a technical error.
- The `ip_address` import in Step 3 is unused but harmless.
- In Step 4's `get_routes`, the set comprehension's `isinstance(routes, list)` guard is correctly placed before `r.get('network')`, so short-circuit evaluation prevents an `AttributeError` if `routes` is a string. It's slightly inefficient (re-checks per item) but functionally correct.
- The `pip install netmiko ntc-templates` in Step 1 installs both packages; Netmiko auto-discovers ntc-templates via the `NET_TEXTFSM` env var or default `ntc_templates/templates` location — this works out of the box with recent Netmiko versions.
