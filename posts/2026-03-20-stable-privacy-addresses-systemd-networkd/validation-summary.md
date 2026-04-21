# Validation Summary: How to Configure Stable Privacy Addresses on systemd-networkd

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- IPv6 SLAAC
- systemd-networkd
- systemd `.network` files
- RFC 7217 stable opaque interface identifiers
- RFC 4941 temporary IPv6 privacy addresses
- Linux IPv6 sysctls
- `ip` and `networkctl`

## Sources Consulted
- systemd `systemd.network(5)` documentation for `IPv6PrivacyExtensions=`, `IPv6LinkLocalAddressGenerationMode=`, and `[IPv6AcceptRA] Token=`: https://www.freedesktop.org/software/systemd/man/devel/systemd.network.html
- systemd `networkctl(1)` documentation for `networkctl status`: https://www.freedesktop.org/software/systemd/man/devel/networkctl.html
- Linux kernel IP sysctl documentation for `use_tempaddr`, `stable_secret`, and `addr_gen_mode`: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 7217, stable and opaque interface identifiers with SLAAC: https://www.rfc-editor.org/rfc/rfc7217.html
- RFC 4941, temporary privacy addresses for SLAAC: https://www.rfc-editor.org/rfc/rfc4941.html

## Issues Found
- The post incorrectly said `IPv6PrivacyExtensions=` provides RFC 7217 stable privacy addresses. Updated the explanation to state that `IPv6PrivacyExtensions=` controls RFC 4941 temporary addresses, while RFC 7217-style SLAAC identifiers are configured with `[IPv6AcceptRA] Token=prefixstable`.
- The `IPv6PrivacyExtensions=no` table entry incorrectly said it uses EUI-64 addresses. Changed it to say it disables RFC 4941 temporary addresses; the non-temporary SLAAC IID is controlled separately.
- The configuration examples incorrectly used `IPv6PrivacyExtensions=kernel` and Linux `addr_gen_mode` sysctls as the systemd-networkd method for RFC 7217. Replaced them with `Token=prefixstable` and `IPv6LinkLocalAddressGenerationMode=stable-privacy`, and clarified that networkd uses its own RA client for `IPv6AcceptRA=yes`.
- The EUI-64 verification snippet claimed to compute an EUI-64 IID but only printed the MAC address. Added a shell snippet that computes the modified EUI-64 IID for comparison.
- The `networkctl` verification step told readers to look for `IPv6PrivacyExtensions` in `networkctl status`, which is not the useful status field for this configuration. Updated it to check the matched network file and `IPv6 Address Generation Mode: stable-privacy`.

## Review Notes
- The corrected configuration uses current systemd-networkd syntax. Older systemd releases before `[IPv6AcceptRA] Token=` used older `IPv6Token=` syntax, but the post does not target those releases.
