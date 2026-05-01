# Validation Summary: How to Configure DHCP Client Options with systemd-networkd

## Status
validated

## Post Type
Guide

## Technologies Covered
- `systemd-networkd`
- `systemd.network` `.network` configuration files
- DHCPv4 client configuration
- `networkctl`
- Linux networking

## Sources Consulted
- Official `systemd.network(5)` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Official `networkctl(1)` documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- RFC 3442, The Classless Static Route Option for DHCPv4: https://www.rfc-editor.org/rfc/rfc3442
- RFC 4039, Rapid Commit Option for DHCPv4: https://www.rfc-editor.org/rfc/rfc4039
- RFC 7844, Anonymity Profiles for DHCP Clients: https://www.rfc-editor.org/rfc/rfc7844

## Issues Found
- The post used `[DHCP]` for DHCPv4 client options. I updated the text and examples to use `[DHCPv4]`, which is the current documented section in `systemd.network(5)`.
- The post said `ClientIdentifier=mac` is the default. I corrected this to reflect the documented default of `ClientIdentifier=duid`.
- The static DNS example used an invalid `[DNS]` section. I moved `DNS=8.8.8.8` into the `[Network]` section, where `DNS=` is documented.
- The comment for `VendorClassIdentifier=` described it as a raw option. I corrected it to describe the setting as the DHCP option 60 vendor class identifier.
- The `Anonymize=` comment said it randomizes the client ID. I corrected it to reflect that it enables the RFC 7844 DHCP anonymity profile.
- The `Hostname=` takeaway overstated the behavior as DNS registration. I corrected it to the documented behavior: sending a hostname to the DHCP server.

## Review Notes
- The post is now accurate for current `systemd-networkd` documentation, and the concrete client-option examples are DHCPv4-specific.
- Some settings are version-dependent on older distributions: `Anonymize=` was added in systemd 235, `RequestOptions=` in 244, `UseGateway=` in 246, `RapidCommit=` in 255, and `networkctl renew` in 244.
