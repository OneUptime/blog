# Validation Summary: Temporary vs Stable IPv6 Addresses Explained

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 SLAAC
- Temporary IPv6 addresses and privacy extensions
- Stable privacy addresses
- RFC 8981
- RFC 7217
- RFC 6724
- RFC 4862 address lifetimes
- Linux iproute2 and IPv6 sysctl settings
- systemd-networkd
- NetworkManager
- Python socket programming
- macOS IPv6 route inspection

## Sources Consulted
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC: https://datatracker.ietf.org/doc/html/rfc7217
- RFC 6724: Default Address Selection for IPv6: https://datatracker.ietf.org/doc/html/rfc6724
- RFC 4862: IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- ip-address(8) manual page: https://manpages.ubuntu.com/manpages/jammy/man8/ip-address.8.html
- systemd.network(5) documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- NetworkManager IPv6 settings documentation: https://www.networkmanager.dev/docs/api/latest/settings-ipv6.html
- NetworkManager.conf documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- macOS route(8) manual page: https://man.freebsd.org/cgi/man.cgi?apropos=0&manpath=macOS+13.6.5&query=route&sektion=8

## Issues Found
- The examples used invalid IPv6 documentation addresses such as `2001:db8:x:y:...` and non-address placeholders such as `2001:db8::stable-addr`. Replaced them with syntactically valid `2001:db8::/32` documentation-prefix examples.
- The stable address rotation description was too absolute. Updated it to note that stable addresses can change when the prefix/network or generation secret changes.
- The deprecated-address lifecycle wording said deprecated addresses are never used for new connections. RFC 4862 discourages, but does not absolutely forbid, their use when no suitable preferred address exists. Updated the wording accordingly.
- The RFC 6724 source address selection description implied temporary addresses are always chosen. Updated it to say they are usually preferred when otherwise eligible, because other source-selection rules and explicit application binds can override that preference.
- The macOS `route -n get -inet6` note incorrectly implied a Linux-style temporary source address display. Updated it to describe route/interface inspection and rely on the `curl -6` test for externally observed source address.
- The link-local address note said `fe80::` addresses are always stable. Updated it because link-local interface identifiers depend on OS and address-generation configuration.
- The RFC 7217 formula omitted `DAD_counter` and described the function specifically as HMAC. Updated the description to a PRF over prefix, interface, network ID, DAD counter, and secret key.
- The systemd-networkd configuration used a non-existent `AddressGenerationMode=stable-privacy` setting. Replaced it with the documented `[IPv6AcceptRA] Token=prefixstable` configuration for RFC 7217 SLAAC identifiers.
- The NetworkManager example was changed from an ambiguous global configuration snippet to the documented per-connection `nmcli connection modify ... ipv6.addr-gen-mode stable-privacy` form.
- The Python server comment incorrectly said binding to `::` makes the OS use the stable address for inbound traffic. Updated it to say the socket accepts traffic to any local IPv6 address and DNS should publish the stable address.
- The Python client example connected to Google Public DNS on TCP port 80 and used invalid placeholder IPv6 literals. Updated it to use TCP port 53 for the DNS address and valid documentation-prefix placeholders for the forced-source example.
- The Linux `use_tempaddr` troubleshooting check only inspected `all`. Added the per-interface `eth0` check and setting because IPv6 sysctls are commonly managed per interface.

## Review Notes
The post is accurate after the edits. The exact defaults for temporary valid lifetimes vary by operating system and Linux kernel/distribution configuration, so the post appropriately keeps lifetime examples illustrative rather than normative.
