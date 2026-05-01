# Validation Summary: DHCPv6 Options Reference and Configuration Guide

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- DHCPv6
- IPv6
- ISC DHCP (`dhcpd`/`dhclient`)
- Kea DHCPv6
- systemd-networkd
- `tcpdump`

## Sources Consulted
- IANA DHCPv6 Parameters registry: https://www.iana.org/assignments/dhcpv6-parameters/dhcpv6-parameters.xhtml
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 3319, DHCPv6 Options for SIP Servers: https://www.rfc-editor.org/rfc/rfc3319.html
- RFC 3646, DNS Configuration Options for DHCPv6: https://www.rfc-editor.org/rfc/rfc3646
- RFC 4075, SNTP Configuration Option for DHCPv6: https://www.rfc-editor.org/rfc/rfc4075.html
- RFC 4242, Information Refresh Time Option for DHCPv6: https://www.rfc-editor.org/rfc/rfc4242.html
- RFC 5908, NTP Server Option for DHCPv6: https://www.rfc-editor.org/rfc/rfc5908.html
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 `dhclient.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC standard DHCP options reference: https://kb.isc.org/docs/standard-dhcp-options
- Kea Administrator Reference Manual, DHCPv6 server: https://kea.readthedocs.io/en/stable/arm/dhcp6-srv.html
- systemd `systemd.network` documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.network.html

## Issues Found
- The introduction described DHCPv4 as having a "255-option space". I corrected this to an 8-bit option code space (`0-255`), which is the accurate comparison to DHCPv6's 16-bit code space.
- The SIP option codes were incorrect. The post listed SIP options as codes `82` and `83`, but the official DHCPv6 registry and RFC 3319 define SIP server domain names as option `21` and SIP server addresses as option `22`. I corrected both rows.
- The SNTP/NTP descriptions were oversimplified. Option `31` is the legacy SNTP option and RFC 5908 deprecates RFC 4075 for modern NTP use; option `56` is an NTP server container option with suboptions rather than a plain list of addresses. I corrected the table descriptions and the ISC SNTP comment.
- The `IA_TA` row did not reflect current standards status. RFC 9915 obsoletes temporary-address assignment via `IA_TA`, so I marked that option as obsolete in the table.
- The ISC DHCP rapid-commit example used `allow rapid-commit;`, which is not the documented DHCPv6 option syntax in ISC DHCP. I replaced it with `option dhcp6.rapid-commit;`.
- The ISC "Custom/Vendor Options" example mixed custom-option definition with an incorrect redeclaration of the standard `dhcp6.vendor-opts` option. I replaced it with a valid custom DHCPv6 option definition and value, and left vendor-specific option `17` in its own dedicated section.
- The Kea custom option example defined `http-proxy` but never actually supplied a value for it. I added the matching `option-data` entry so the example now demonstrates both definition and use.
- The `systemd-networkd` ORO example did not actually configure ORO contents. `UseAddress=`, `UseDNS=`, `UseDomains=`, and `UseNTP=` control how received data is used, but `RequestOptions=` is what populates the ORO. I replaced the example with a documented DHCPv6-enabled `RequestOptions=` configuration.
- The ISC vendor-option hex example was reformatted onto one unambiguous line while preserving the same enterprise number and suboption payload.

## Review Notes
- RFC 9915 was published in January 2026 and obsoletes RFC 8415. The post is now aligned with the current DHCPv6 base specification where it materially affected the content reviewed here.
- ISC DHCP examples remain technically valid, but ISC DHCP is now a legacy/EOL product. Kea is ISC's actively maintained DHCP platform.
- The post still includes SNTP option `31` examples because they are syntactically valid and supported by ISC DHCP and Kea, but new deployments should generally prefer NTP option `56` when client and server support is available.
- The workspace does not have `dhcpd`, `dhclient`, or `kea-dhcp6` installed, so the review was documentation-based rather than a live parser run.
