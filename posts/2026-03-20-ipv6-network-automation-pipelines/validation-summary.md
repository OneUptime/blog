# Validation Summary: How to Build IPv6 Network Automation Pipelines - Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and routing
- YAML
- Python
- Jinja2
- Nornir
- NAPALM
- nftables
- CI/CD automation
- BGP, OSPFv3, and IS-IS

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Nornir initialization docs: https://nornir.readthedocs.io/en/latest/tutorial/initializing_nornir.html
- Nornir task and `MultiResult` API docs: https://nornir.readthedocs.io/en/latest/api/nornir/core/task.html
- `nornir_napalm` task API docs: https://nornir.tech/nornir_napalm/html/api/tasks.html
- NAPALM `get_bgp_neighbors()` documentation: https://napalm.readthedocs.io/en/latest/base.html
- `nornir_utils` `print_result()` docs: https://nornir.tech/nornir_utils/html/api/functions.html
- nftables `nft(8)` man page: https://www.netfilter.org/projects/nftables/manpage.html
- `schedule` library docs: https://schedule.readthedocs.io/en/stable/index.html
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 9637, Expanding the IPv6 Documentation Space: https://www.ietf.org/rfc/rfc9637.html
- Junos OS IS-IS User Guide: https://www.juniper.net/documentation/us/en/software/junos/is-is/is-is.pdf

## Issues Found
- The YAML source-of-truth example contained invalid IPv6 strings such as `fd00:mgmt::/64` and `fd00:noc::/64`. I replaced the sample addressing with valid RFC 4193-style ULA prefixes and updated the related loopback, link, and ACL entries to keep the example consistent.
- The `isis_net` example used `49.0001`, which is only an area fragment and not a full IS-IS NET. I changed it to `49.0001.0000.0000.0001.00`, which includes area ID, system ID, and selector.
- The continuous compliance example checked `data["state"]`, but NAPALM `get_bgp_neighbors()` returns `is_up` and `is_enabled` fields instead of a string state. I updated the logic to alert on enabled IPv6 peers that are down.
- The deployment snippet called `deploy_configs(configs, dry_run=True)` without defining `configs`. I added the Stage 2 generation call before the dry run so the example is internally consistent.

## Review Notes
- The `nft -c -f -` example is correct for syntax-only validation of nftables rules read from standard input, but it applies to nftables configs rather than vendor router configuration syntax.
- The Nornir/NAPALM examples are current against the referenced docs, but actual `dry_run` and getter behavior still depends on the selected network OS driver.
