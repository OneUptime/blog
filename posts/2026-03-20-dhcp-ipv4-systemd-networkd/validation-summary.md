# Validation Summary: How to Configure DHCP for IPv4 with systemd-networkd - Ipv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- systemd-networkd
- DHCPv4
- `.network` configuration files
- `networkctl`
- Linux network configuration

## Sources Consulted
- systemd.network(5), official upstream man page: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd.syntax(7), official upstream syntax reference: https://www.freedesktop.org/software/systemd/man/257/systemd.syntax.html
- networkctl(1), official upstream man page: https://www.freedesktop.org/software/systemd/man/254/networkctl.html
- Local `man systemd.network` and `networkctl --help` on the review host (`systemd 255.4-1ubuntu8.14`) to confirm currently installed CLI behavior and option descriptions

## Issues Found
- The `.network` examples used inline `# ...` comments after assignments. In systemd configuration files, only lines starting with `#` or `;` are treated as comments, so those examples were syntactically incorrect. I moved the comments onto their own lines.
- The basic example used `DHCP=yes`, which enables both DHCPv4 and DHCPv6-related behavior. Because the post is specifically about IPv4, I changed it to `DHCP=ipv4`.
- The client identifier section incorrectly said `ClientIdentifier=mac` is the default and included `duid-only` as an example value. Current upstream and local systemd 255 documentation describe `mac` and `duid`, with `duid` as the default. I corrected the example accordingly.
- The section titled "Request Specific Lease Duration" was inaccurate. `RequestBroadcast=` and `MaxAttempts=` do not request a specific lease duration from the server. I renamed the section to describe the behavior those settings actually control.
- The "Static Fallback Address" section described unsupported behavior. `Address=` adds a static address alongside DHCP; it is not applied only when DHCP fails. The example also used `FallbackLeaseLifetimeSec=300`, but that setting does not accept an arbitrary numeric lease lifetime for this purpose. I replaced the section with an accurate static-address-alongside-DHCP example.

## Review Notes
- `LinkLocalAddressing=ipv4` or `LinkLocalAddressing=yes` is the documented fallback mechanism if you want IPv4 link-local autoconfiguration after DHCPv4 does not succeed; the reviewed post does not cover that.
- `networkctl -a` is valid and works on current systems, but the output is only useful when interfaces are actually managed by `systemd-networkd`.
