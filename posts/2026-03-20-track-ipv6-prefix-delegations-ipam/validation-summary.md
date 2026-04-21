# Validation Summary: How to Track IPv6 Prefix Delegations in IPAM

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- IPv6 prefix delegation
- DHCPv6-PD
- Kea DHCP
- ISC DHCP
- NetBox IPAM
- pynetbox
- Cisco IOS/IOS-XE DHCPv6 operational commands
- Python
- Bash

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 8415 datatracker entry noting RFC 3633 was obsoleted: https://datatracker.ietf.org/doc/rfc8415/
- Kea Management API documentation: https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html
- Kea API reference for `lease6-get-all`: https://kea.readthedocs.io/en/latest/api.html#lease6-get-all
- Kea `kea-admin` manual page: https://kea.readthedocs.io/en/latest/man/kea-admin.8.html
- pynetbox endpoint documentation: https://pynetbox.readthedocs.io/en/stable/endpoint.html
- pynetbox project README: https://github.com/netbox-community/pynetbox
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox custom fields documentation: https://netbox.readthedocs.io/en/stable/customization/custom-fields/
- NetBox tag serializer source: https://github.com/netbox-community/netbox/blob/main/netbox/netbox/api/serializers/features.py
- ISC DHCP 4.4 `dhcpd.leases` manual page: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases
- Cisco IOS XE DHCPv6 prefix delegation guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/xe-16-10/dhcp-xe-16-10-book/ip6-dhcp-prefix-xe.html

## Issues Found
- The introduction cited only RFC 3633. Updated it to cite the current DHCPv6 standard, RFC 9915, while retaining RFC 3633 as the original prefix delegation RFC.
- The Kea examples expected an unwrapped JSON object from HTTP. Kea HTTP responses are list-wrapped, so the code now unwraps a one-element list and checks the result code.
- The Kea IA_PD examples used `lease["prefix"]`, but Kea returns `ip-address` plus `prefix-len`. Updated both Python and Bash snippets.
- The Kea validation command used `kea-admin lease-get-all dhcp6`, which is not a valid `kea-admin` command. Replaced it with a `curl` POST to Kea's management API.
- The Kea lease query requires the `lease_cmds` hook library. Added that requirement to the code comment.
- The NetBox example assumed the `dhcpv6-pd` tag already existed and updated only the description for existing prefixes. Updated it to create the tag if needed and update description, custom fields, and tags for existing prefixes.
- The ISC DHCP parser used an undocumented syslog format. Replaced it with a parser for the documented DHCPv6 lease-file format using `ia_pd`, `iaprefix`, and `binding state`.
- The validation wording implied traffic verification, while the commands validate DHCP lease or binding presence and expiry. Adjusted the wording and comments.

## Review Notes
- NetBox custom fields in the example must still be created on the Prefix model before the script runs; the post now calls this out in a code comment.
- ISC DHCP lease-file paths vary by distribution, so `LEASE_FILE` may need to be adjusted.
- For large Kea deployments, `lease6-get-page` is preferable to `lease6-get-all`; the current example is acceptable for a small tutorial but may not scale.
