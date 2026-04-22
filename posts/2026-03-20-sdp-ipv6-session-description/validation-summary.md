# Validation Summary: How to Handle IPv6 in SDP (Session Description Protocol)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SDP / Session Description Protocol
- IPv6 addressing
- SIP and VoIP media negotiation
- RTP media bridging
- Asterisk PJSIP configuration
- Python `ipaddress` parsing
- WebRTC ICE candidates

## Sources Consulted
- RFC 8866: SDP: Session Description Protocol - https://www.rfc-editor.org/rfc/rfc8866.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 3261: SIP: Session Initiation Protocol - https://www.rfc-editor.org/rfc/rfc3261.html
- RFC 8839: SDP Offer/Answer Procedures for ICE - https://datatracker.ietf.org/doc/html/rfc8839
- Python `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- Asterisk IPv6 Support documentation - https://docs.asterisk.org/Deployment/IPv6-Support/
- Asterisk PJSIP Transport Selection documentation - https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/PJSIP-Transport-Selection/
- Asterisk `res_pjsip` configuration documentation - https://docs.asterisk.org/Asterisk_22_Documentation/API_Documentation/Module_Configuration/res_pjsip/
- Asterisk `pjsip.conf` sample configuration - https://asterisk-doxygen.osso.pub/master/api/d9/d25/pjsip_8conf.html

## Issues Found
- The post cited RFC 4566 as the current SDP reference. Updated the introduction to reference RFC 8866, which obsoletes RFC 4566.
- Several example IPv6 literals used non-hex words such as `alice`, `media-server`, `asterisk`, `phone`, `client`, and `stun`. Replaced them with valid `2001:db8::/32` documentation-prefix IPv6 addresses.
- The Python parser used `ipaddress.ip_address()` for fields marked `IP6`, which would also accept IPv4 literals. Changed those calls to `ipaddress.IPv6Address()` so the sample actually validates IPv6 addresses.
- The SIP comparison said brackets are required in SIP headers generally. Narrowed this to IPv6 literal host portions in SIP URIs, matching RFC 3261.
- The Asterisk generated SDP comment used an invalid IPv6 literal and described the address source too narrowly. Updated it to a valid example address and referenced the selected IPv6 transport and media address.

## Review Notes
- The Python snippets were executed successfully after the corrections.
- SDP allows FQDNs in relevant address fields in some contexts; this post intentionally focuses on raw IPv6 address literals and bracket handling.
- Asterisk IPv6 behavior depends on the configured PJSIP transport, media address options, and Asterisk/PJProject IPv6 support in the installed build.
