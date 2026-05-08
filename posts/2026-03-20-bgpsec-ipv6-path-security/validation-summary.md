# Validation Summary: How to Configure BGPsec for IPv6 Path Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- BGPsec
- BGP
- IPv6 routing
- RPKI and ROAs
- BGPsec Router Certificates
- FRRouting
- OpenSSL
- RIPEstat Data API
- Python requests

## Sources Consulted
- RFC 8205: BGPsec Protocol Specification, https://www.rfc-editor.org/rfc/rfc8205
- RFC 8208: BGPsec Algorithms, Key Formats, and Signature Formats, https://www.rfc-editor.org/rfc/rfc8208
- RFC 8209: A Profile for BGPsec Router Certificates, Certificate Revocation Lists, and Certification Requests, https://www.rfc-editor.org/rfc/rfc8209
- FRRouting BGP documentation, https://docs.frrouting.org/en/latest/bgp.html
- OpenSSL ecparam documentation, https://docs.openssl.org/master/man1/openssl-ecparam/
- RIPEstat BGP Updates API documentation, https://stat.ripe.net/docs/data-api/api-endpoints/bgp-updates

## Issues Found
- The BGPsec comparison said the path "cannot be forged or altered." Changed this to say each AS hop authorized the advertisement, matching RFC 8205's security guarantee more precisely.
- The workflow said every BGP speaker generates a key pair registered with RPKI. Changed this to clarify that BGPsec speakers sending signed eBGP updates need a private key associated with an RPKI BGPsec Router Certificate; validation does not require the validating router to have its own certificate.
- The router key setup referred to registering a "Router Key Object." Changed this to BGPsec Router Certificate language, which matches RFC 8209.
- The FRRouting section claimed experimental BGPsec support and showed undocumented `capability bgpsec-send` and `capability bgpsec-receive` commands. Current official FRR BGP documentation documents RPKI origin validation but not BGPsec commands, so the section now states that BGPsec activation is vendor- and version-specific and shows only an FRR RPKI preparation example.
- The FRRouting example used `2001:db8:peer::1`, which is not valid IPv6 syntax. Changed it to the valid documentation address `2001:db8:1::1`.
- The deployment challenges said BGPsec breaks with AS path prepending. RFC 8205 defines `pCount` specifically to represent normal AS path prepending semantics, so this was corrected to say arbitrary AS path rewriting is constrained while normal prepending is represented with `pCount`.
- The practical deployment strategy recommended enabling BGPsec on internal iBGP first. Since BGPsec is primarily about securing AS-path authorization across eBGP AS hops, this was changed to testing in a lab or controlled edge peer before expanding to eBGP peers.

## Review Notes
The OpenSSL commands are syntactically valid for generating and exporting a P-256 EC key, but operational BGPsec use requires a proper BGPsec Router Certificate and router implementation support. The RIPEstat Python example uses the documented `bgp-updates` endpoint and response structure, though the documentation prefix `2001:db8::/32` is unlikely to return real operational updates.
