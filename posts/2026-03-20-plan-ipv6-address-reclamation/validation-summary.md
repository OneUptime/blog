# Validation Summary: How to Plan IPv6 Address Reclamation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- NetBox IPAM
- pynetbox
- Python 3
- Linux `ping` and `ip`
- BIND `dig` and `nsupdate`
- Neighbor Discovery Protocol (NDP)

## Sources Consulted
- NetBox IP address model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox REST API filtering documentation: https://netbox.readthedocs.io/en/stable/reference/filtering/
- pynetbox endpoint documentation: https://pynetbox.readthedocs.io/en/stable/endpoint.html
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- BIND 9 manpages for `dig` and `nsupdate`: https://bind9.readthedocs.io/en/v9.18.30/manpages.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- Local command help/output checked in the workspace: `ping6 -h`, `dig -h`, `ip -6 neigh help`, `nsupdate` usage output

## Issues Found
- The workflow was internally inconsistent about reclaimed address state. It said to mark an address deprecated before confirmation and later mark it available, while the code and conclusion used NetBox's `deprecated` status. I changed the workflow to flag candidates for review first and mark the address deprecated only at reclamation time.
- The Step 1 explanation overstated what the example script proves. NDP is link-local per RFC 4861 and `ip -6 neigh` only shows the validation host's local neighbor cache, so I added a note clarifying that the 30-day policy needs monitoring/IPAM metadata and that the sample script is only a probe-based screening pass.
- The NetBox fallback lookup used `address__startswith`, which is not a documented NetBox REST lookup expression. I changed it to `address__isw`, which matches NetBox's documented case-insensitive "starts with" filter syntax.
- The DNS examples had incorrect or non-canonical syntax. I changed the `nsupdate` input from `del` to `update delete`, fixed `dig` to use `dig server-01.example.com AAAA`, and updated the neighbor-table check to the documented `ip -6 neigh show to ...` form.
- The Python snippet in Step 3 claimed to update firewall rule annotations even though the function did not do that, and it relied on a `datetime` import from an earlier snippet. I corrected the docstring/comments and added a local `datetime` import so the snippet is self-consistent.

## Review Notes
- The post is technically sound after the fixes above.
- The NetBox URL, mail host, TSIG key path, and DNS zone are environment-specific placeholders and still need to be adapted by readers.
- Probe-based reclamation candidate detection can produce false positives for systems that intentionally drop ICMPv6 echo or are not on the validation host's local link; production workflows should prefer authoritative monitoring, asset lifecycle data, or both.
