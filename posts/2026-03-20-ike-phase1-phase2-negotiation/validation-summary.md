# Validation Summary: How to Understand IKE Phase 1 and Phase 2 Negotiation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPsec
- IKEv1
- IKEv2
- strongSwan
- Linux `ip xfrm`

## Sources Consulted
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://datatracker.ietf.org/doc/html/rfc7296
- strongSwan Algorithm Proposals (Cipher Suites): https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan Logging documentation: https://docs.strongswan.org/docs/latest/config/logging.html
- strongSwan Introduction: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan 6.0 release notes: https://docs.strongswan.org/docs/latest/news/whatsNew.html
- Official strongSwan `ipsec.conf` manpage source: https://github.com/strongswan/strongswan/blob/master/man/ipsec.conf.5.in
- Official strongSwan legacy `ipsec` command manpage source: https://github.com/strongswan/strongswan/blob/master/src/ipsec/_ipsec.8.in
- Official strongSwan `stroke` command source: https://github.com/strongswan/strongswan/blob/master/src/stroke/stroke.c

## Issues Found
- The IKEv2 flow described `IKE_AUTH` proof as a certificate or PSK hash. I changed it to reference the `AUTH` payload, because in IKEv2 the peer proves identity with the `AUTH` payload, optionally alongside certificates.
- The post presented `/etc/ipsec.conf` and `ipsec`/`stroke` commands as if they were the default current strongSwan workflow. I marked that backend as legacy because strongSwan documents `ipsec.conf`/`stroke` as deprecated and no longer built by default in 6.0.
- The Phase 1 proposal format comment was incomplete for strongSwan. I corrected it to show that IKE proposals may include an optional PRF and that AEAD proposals use a different shape than classic encryption-plus-integrity proposals.
- The AES-GCM Phase 1 example comment treated SHA-384 like a generic hash/integrity algorithm. I corrected it to identify `prfsha384` specifically as the PRF.
- The Phase 2 proposal format and PFS explanation were misleading for IKEv2. I corrected the post to note that a DH group in `esp=` applies to CHILD_SA rekeying or a separate `CREATE_CHILD_SA` exchange, not to the implicit CHILD_SA created during the initial `IKE_AUTH` exchange.
- The `margintime=540s` comment claimed rekeying starts 9 minutes before expiry. I corrected it to 9-18 minutes before expiry by default, because strongSwan applies `rekeyfuzz=100%` randomization unless changed.
- The logging snippet used an invalid `filelog` structure for `strongswan.conf`-style configuration. I corrected it to a valid `charon.filelog` layout and changed the follow command to read `/var/log/charon.log`, which matches the configured backend.
- The active-SA inspection commands were inaccurate because `ipsec statusall` output does not expose literal `IKE SA` and `CHILD SA` lines to grep for. I replaced them with `ipsec statusall`.
- The manual rekey command `ipsec rekey <connection-name>` was incorrect. I replaced it with `ipsec stroke rekey <connection-name>`, which is the valid legacy command for the backend used in the post.

## Review Notes
The post is now technically correct, but it intentionally uses strongSwan's legacy `ipsec.conf`/`stroke` workflow. For new deployments, strongSwan's current documentation prefers `swanctl.conf` and `swanctl`.
