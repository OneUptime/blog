# Validation Summary: How to Configure Infoblox for IPv6 IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Infoblox NIOS / WAPI
- IPv6 IPAM
- DHCPv6
- DNS AAAA and PTR records
- DNS64 / NAT64
- Python `requests`
- `curl`

## Sources Consulted
- Infoblox NIOS 9.0.x, "Using NIOS APIs": https://infoblox-docs.atlassian.net/wiki/spaces/nios90/pages/156664532/Using%2BNIOS%2BAPIs
- Infoblox NIOS 8.6, "About DNS64": https://infoblox-docs.atlassian.net/wiki/spaces/nios86/pages/1103528717
- Infoblox NIOS 8.6, "Configuring IPv6 Address Ranges": https://infoblox-docs.atlassian.net/wiki/spaces/nios86/pages/1104937744
- Infoblox NIOS 8.5, "Managing Resource Records": https://infoblox-docs.atlassian.net/wiki/spaces/nios85/pages/35913807
- Infoblox NIOS 8.6, "Understanding DNS for IPv6": https://infoblox-docs.atlassian.net/wiki/spaces/nios86/pages/1103528589
- Infoblox NIOS 9.0.x, "Configuring the Next Available Network or IP Address": https://infoblox-docs.atlassian.net/wiki/spaces/nios90/pages/280663648
- Public Infoblox WAPI reference mirror for exact object names, fields, and function syntax: https://ipam.illinois.edu/wapidoc/objects/networkview.html
- https://ipam.illinois.edu/wapidoc/objects/ipv6network.html
- https://ipam.illinois.edu/wapidoc/objects/ipv6range.html
- https://ipam.illinois.edu/wapidoc/objects/record.aaaa.html
- https://ipam.illinois.edu/wapidoc/objects/record.ptr.html
- https://ipam.illinois.edu/wapidoc/objects/discoverytask.html
- https://ipam.illinois.edu/wapidoc/objects/dns64group.html

## Issues Found
- The post created a network view in Step 1 but did not use it in later IPv6 network and range examples. I added `network_view: "ipv6-production"` to the IPv6 network and IPv6 range payloads so the examples are internally consistent.
- The `record:aaaa` example used `create_ptr`, which is not a documented create field for the AAAA WAPI object. I replaced that example with an explicit `record:aaaa` call plus a separate `record:ptr` call for the reverse record.
- The AAAA search example used a wildcard-style `name~` query that was not a reliable match pattern for the intended result set. I changed it to a zone-scoped search using `zone` and `view`.
- The `_nextavailableip` example used unsupported URL syntax and parsed the return value incorrectly. I changed it to a supported WAPI function call using `_function=next_available_ip`, added query params support to the helper, and fixed the return handling to use `result["ips"][0]`.
- The discovery example attempted to create `discovery:task`, but the documented WAPI object is `discoverytask`, it is not creatable, and the fields `discovery_method`, `ICMP6`, and `scan_interfaces` were not valid there. I replaced it with a supported pattern: retrieve the current discovery task, update it, then start it with `network_discovery_control`.
- The DNS64 example used the wrong WAPI object name and an invalid `mapped` payload shape. I changed `dns:dns64synthesisgroup` to `dns64group` and corrected `mapped` to an address access-control entry.
- The conclusion incorrectly said the next-available-IP workflow operated "without conflict checking" and implied a single AAAA create call could also create PTR data. I corrected the wording to match documented next-available behavior and DNS64 deployment requirements.

## Review Notes
- The post hardcodes `/wapi/v2.12`. Publicly indexed Infoblox documentation currently shows WAPI 2.13.7 in NIOS 9.0.x, so readers should use the WAPI version supported by their appliance even though the corrected object and function names remain consistent with current WAPI documentation.
- The DNS64 step now accurately creates a synthesis group, but full DNS64 deployment also requires enabling DNS64 on the relevant Grid, member, or DNS view and pairing it with NAT64.
