# Validation Summary: How to Understand Stable Privacy Addresses (RFC 7217)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- IPv6 SLAAC
- RFC 7217 stable and opaque interface identifiers
- RFC 8981 temporary privacy addresses
- Linux IPv6 sysctl settings
- systemd-networkd
- iproute2
- Python `secrets` module

## Sources Consulted
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC): https://www.rfc-editor.org/rfc/rfc7217.html
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981.html
- RFC 8064: Recommendation on Stable IPv6 Interface Identifiers: https://www.rfc-editor.org/rfc/rfc8064.html
- Linux kernel IP sysctl documentation for `stable_secret` and `addr_gen_mode`: https://docs.kernel.org/6.8/networking/ip-sysctl.html
- systemd.network manual for `IPv6PrivacyExtensions=` and `[IPv6AcceptRA] Token=prefixstable`: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- iproute2 `ip link help` output for `addrgenmode { eui64 | none | stable_secret | random }`

## Issues Found
- RFC 7217 stability was described too broadly as "per network" or "per SSID". Updated the explanation to match RFC 7217: stability is for the same interface and SLAAC prefix within a subnet, with the optional `Network_ID` adding network-specific differentiation.
- The RFC 7217 function was described as a cryptographic hash. Updated it to the RFC wording of a pseudorandom function that may be implemented with a cryptographic hash, and included the full set of relevant inputs in the conclusion.
- Temporary privacy addresses were described as breaking existing connections when rotated. RFC 8981 says deprecated temporary addresses can continue to be used for established connections but are not used for new connections, so the text was corrected.
- The Linux `addr_gen_mode` values were incorrect. Updated them to match kernel documentation: `0` EUI-64, `1` no link-local address and EUI-64 for autoconf, `2` stable privacy with `stable_secret`, and `3` stable privacy with a random secret if unset.
- The post said to configure RFC 7217 on Linux with `addr_gen_mode=3` plus `stable_secret`. Updated the examples to use `addr_gen_mode=2` with an explicit `stable_secret`, and note that `3` is for kernel-generated random secrets when unset.
- The systemd-networkd example implied `IPv6PrivacyExtensions=kernel` configured RFC 7217. Updated the snippet to show `[IPv6AcceptRA] Token=prefixstable`, and clarified that `IPv6PrivacyExtensions=` controls temporary-address policy.
- One `stable_secret` example was not a valid IPv6 address because it used `::` while already containing eight hextets. Replaced it with a valid eight-hextet IPv6 value.
- The persistence example used `cat >> /etc/sysctl.d/...`, which would not work for a normal user because the shell redirection is not covered by `sudo`. Replaced it with `sudo tee`.
- Replaced the unverified Linux "kernel 4.6+" claim with a version-neutral check for older systems.
- Adjusted overbroad claims about applications maintaining sessions across reconnects and about all modern operating systems using RFC 7217 by default.

## Review Notes
The examples still use `eth0`; users must substitute their actual interface name. Systems managed by NetworkManager or another network stack may ignore some kernel-level SLAAC settings for global addresses, so users should apply the equivalent setting in their active network manager when applicable.
