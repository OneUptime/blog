# Validation Summary: How to Parse show ip interface brief Output with Python and Regular Expressions

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Python 3 (`re`, `ipaddress`, `csv`, `collections.Counter`, `concurrent.futures.ThreadPoolExecutor`)
- Python regular expressions (`re.compile`, `finditer`, `re.MULTILINE`, lazy quantifiers)
- Netmiko (`ConnectHandler`, context manager, `enable()`, `send_command(use_textfsm=True)`)
- TextFSM via ntc-templates
- Cisco IOS CLI commands (`show ip interface brief`, `show ip route`)

## Sources Consulted
- Netmiko source code (BaseConnection, utilities.py, ssh_dispatcher.py): https://github.com/ktbyers/netmiko/blob/develop/netmiko/
- Specifically `clitable_to_dict()` in `netmiko/utilities.py` which lowercases TextFSM template headers
- ntc-templates `cisco_ios_show_ip_route.textfsm` template: https://github.com/networktocode/ntc-templates/blob/master/ntc_templates/templates/cisco_ios_show_ip_route.textfsm
- Cisco IOS Command Reference for `show ip interface brief` and `show ip route` output format
- Python `re` module documentation: https://docs.python.org/3/library/re.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Empirically tested the `show ip interface brief` regex against the article's sample output (all four lines parsed correctly, including "administratively down")

## Issues Found

### 1. Wrong key name `mask` for ntc-templates `show ip route` output (FIXED)
In Step 4, the code accessed `r.get('mask', '32')` to build a CIDR network string. The modern `cisco_ios_show_ip_route.textfsm` template defines the field as `PREFIX_LENGTH` (which Netmiko lowercases to `prefix_length` via `clitable_to_dict()` in `netmiko/utilities.py`). There is no `mask` key in the template's Value declarations, so `r.get('mask', '32')` would silently fall back to `'32'` for every route, producing a `/32` for every entry and breaking the `8.8.8.8` lookup.

Fix applied: changed `r.get('mask', '32')` to `r.get('prefix_length', '32')`.

## Review Notes
- The `show ip interface brief` regex in Step 1 was empirically verified to parse all four sample lines correctly, including the tricky "administratively down" status case (lazy `[\w\s]+?` quantifier + `re.MULTILINE` `$` anchor backtracks correctly).
- Netmiko's `ConnectHandler` does support context manager usage (`__enter__`/`__exit__` defined on `BaseConnection`); `conn.enable()` and `send_command(use_textfsm=True)` are real, current APIs.
- The `show ip route` regex in Step 3 is illustrative and has known limitations the article explicitly disclaims ("flexible but brittle"): it does not match connected routes (`C ...`) because the optional `[admin/metric]` group is followed by a required `\s+` that has nothing to consume on connected lines; it does not match two-character protocol codes like `S*`, `IA`, `EX`, `E1`/`E2`, `N1`/`N2`, `L1`/`L2`; it omits common protocol codes (`R`, `L`, `M`, lowercase `i`, lowercase `o`); the `next_hop` capture `(\S+)` includes the trailing comma from lines like `via 192.168.1.2,`. None of these were corrected since the article's pedagogical arc explicitly recommends TextFSM for real use, and the regex is presented as a teaching example of the brittle approach.
- Minor: the `from datetime import datetime` import in Step 5 is unused. Left as-is (not a correctness issue).
- Minor: `device_info.pop('name', ...)` in Step 5 mutates the input dict — fine for this single-pass example but worth a reader's awareness.
- The protocol-code-to-name mapping in Step 3 maps `'I'` to `'igrp'` and `'E'` to `'egp'`. IGRP and EGP are deprecated/legacy protocols rarely seen in modern IOS; in current routers `D` (EIGRP) is far more common. Not technically wrong (the codes existed historically), so left as-is.
