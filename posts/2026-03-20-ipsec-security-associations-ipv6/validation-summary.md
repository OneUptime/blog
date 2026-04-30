# Validation Summary: How to Understand IPsec Security Associations for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec
- ESP
- AH
- IKEv2
- Linux `ip xfrm`
- strongSwan `swanctl`

## Sources Consulted
- RFC 4301, Security Architecture for the Internet Protocol: https://datatracker.ietf.org/doc/html/rfc4301
- RFC 4303, IP Encapsulating Security Payload (ESP): https://datatracker.ietf.org/doc/html/rfc4303
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://datatracker.ietf.org/doc/html/rfc7296
- strongSwan `swanctl.conf` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan IKE and IPsec SA Renewal documentation: https://docs.strongswan.org/docs/latest/config/rekeying.html
- strongSwan `swanctl --list-sas` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlListSas.html
- strongSwan `charon-systemd` documentation: https://docs.strongswan.org/docs/latest/daemons/charon-systemd.html
- strongSwan `swanctl --log` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlLog.html
- Local `ip xfrm` command help and `ip-xfrm(8)` man page

## Issues Found
- The sample IPv6 addresses `2001:db8:gw1::1`, `2001:db8:gw2::1`, `2001:db8:site1::/48`, and `2001:db8:site2::/48` were invalid because `gw1` and `site1` are not legal hexadecimal IPv6 hextets. Replaced them with valid documentation-prefix IPv6 examples.
- The statement that an SA is "uniquely identified by three values" was too absolute. RFC 4301/RFC 4303 treat SPI as the primary unicast SA identifier, with protocol/address use depending on context and implementation, so the wording was narrowed to inbound/common lookup terminology.
- The strongSwan `swanctl.conf` snippet was not valid as written. `children` must be nested under a connection, and `!` is not the documented comment syntax. The example was updated to a valid `connections { ... children { ... } }` structure with `#` comments.
- The "SA Renewal" terminology was not aligned with the documented IKEv2/strongSwan behavior. It was corrected to "SA Reauthentication" and clarified that reauthentication recreates the IKE SA and associated IPsec SAs.
- The anti-replay example claimed a "default 64 packets" window without a primary source for that as a universal default. The wording was narrowed to match the example shown above instead of asserting a generic default.
- The anti-replay inspection command used `ip xfrm state list`, but the detailed replay context is shown in the post's own detailed output via `ip -s xfrm state list`. The command was corrected accordingly.
- The anti-replay modification example used `ip xfrm state add ... replay-window 512`, which was only a placeholder and not a runnable command. It was replaced with a syntactically valid `ip xfrm state update ... replay-window 512` example.
- The SPD action text said PROTECT means "ENCRYPT/AUTHENTICATE", which overstates the behavior because IPsec policy protection is broader than encryption alone and AH does not encrypt. It was corrected to "Apply IPsec processing".
- The IKEv2 sequence diagram implied the responder simply "Assigns SPI" in the `IKE_AUTH` response. That was simplified to avoid overstating a single-message SPI assignment model for the first CHILD_SA negotiation.

## Review Notes
- `journalctl -u strongswan` is accurate for strongSwan deployments using `charon-systemd`, which the post now states explicitly. Other strongSwan packaging or service layouts may use different unit names.
- `swanctl --list-sas --raw` is current and documented, but it requires a strongSwan installation using the `swanctl`/`vici` management stack.
