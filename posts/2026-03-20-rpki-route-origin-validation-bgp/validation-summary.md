# Validation Summary: How to Implement RPKI Route Origin Validation for BGP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- BGP
- RPKI
- Route Origin Validation (ROV)
- Route Origin Authorizations (ROAs)
- Routinator
- Cisco IOS / IOS XE BGP RPKI configuration
- FRRouting BGP RPKI configuration
- RPKI-to-Router (RTR) protocol

## Sources Consulted
- RFC 6811: BGP Prefix Origin Validation - https://datatracker.ietf.org/doc/rfc6811/
- RFC 9582: A Profile for Route Origin Authorizations (ROAs) - https://www.rfc-editor.org/rfc/rfc9582.html
- RFC 9319 / BCP 185: The Use of maxLength in RPKI - https://www.rfc-editor.org/rfc/rfc9319.html
- Routinator installation documentation - https://routinator.docs.nlnetlabs.nl/en/latest/installation.html
- Routinator manual page - https://routinator.docs.nlnetlabs.nl/en/latest/manual-page.html
- Cisco IOS XE BGP Origin AS Validation configuration guide - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-16-7/irg-xe-16-7-book/bgp-origin-as-validation.html
- Cisco IOS BGP command reference for `bgp rpki server` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS BGP command reference for `show ip bgp rpki servers` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- FRRouting BGP RPKI documentation - https://docs.frrouting.org/en/latest/bgp.html
- ARIN Route Origin Authorization documentation - https://www.arin.net/resources/manage/rpki/roas/

## Issues Found
- The RPKI validation state definitions were simplified in a way that omitted covering prefixes, max-length, and origin-AS matching behavior. Updated them to match RFC 6811 semantics.
- The architecture diagram labeled only three RIRs and used an `IANA` node for RIRs. Updated it to list all five RIRs and use an accurate `RIR` node.
- The Routinator setup used `routinator init --accept-arin-rpa`, which current Routinator documentation marks as deprecated. Replaced it with a note that current releases ship bundled RIR TALs.
- The Routinator RTR listener was bound to `127.0.0.1` while the router was configured to connect to `192.168.1.100`. Updated the RTR bind address so the router can reach the cache server.
- The Routinator validation command used positional arguments. Updated it to the documented `--prefix` and `--asn` options.
- The Cisco verification output did not match Cisco IOS-style `show ip bgp rpki servers` output. Replaced it with output in the documented SOVC-neighbor format.
- The Cisco configuration included `bgp route-origin-validation enable`, which is not part of the Cisco IOS / IOS XE workflow checked. Removed it and clarified that configuring the RPKI server starts validation-state assignment.
- The Cisco route-map used `match rpki notfound`, but Cisco IOS / IOS XE documents the keyword as `not-found`. Updated the Cisco policy snippet.
- The route-map comment said it applied to all eBGP neighbors, but the snippet applied it to one neighbor. Corrected the comment.
- The FRRouting snippet omitted the required `tcp` transport keyword in `rpki cache tcp ...` and reused Cisco's route-map policy without showing FRR's `notfound` syntax. Updated the FRR cache command and included an FRR-compatible policy snippet.
- The FRRouting configuration block was marked as Bash. Changed the code fence to plain text.
- The ROA section used documentation-only prefix space as an example allocated prefix and stated that RPKI "protects" the prefix too absolutely. Updated the wording to refer to the user's real public prefix and to state the protection as conditional on networks performing ROV.
- The conclusion said RPKI Route Origin Validation prevents BGP route hijacking. Softened this to unauthorized-origin hijacks because ROV validates route origins, not full AS paths or every route-leak scenario.

## Review Notes
Current Routinator package installations may start the daemon automatically and are commonly managed through `/etc/routinator/routinator.conf`; the explicit `routinator server` command remains valid for a direct example. Cisco RPKI CLI varies across IOS, IOS XE, IOS XR, and NX-OS, so the examples are best read as Cisco IOS / IOS XE style rather than universal Cisco syntax.
