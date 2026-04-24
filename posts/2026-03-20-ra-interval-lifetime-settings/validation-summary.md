# Validation Summary: How to Understand Router Advertisement Interval and Lifetime Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Neighbor Discovery
- Router Advertisements (RA)
- `radvd`
- Linux `iproute2`
- `tcpdump`

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4191: Default Router Preferences and More-Specific Routes - https://www.rfc-editor.org/rfc/rfc4191
- `radvd.conf(5)` upstream man page - https://github.com/radvd-project/radvd/blob/master/radvd.conf.5.man
- `radvd.conf.example` upstream example - https://github.com/radvd-project/radvd/blob/master/radvd.conf.example
- Local `ip-route(8)` man page
- Local `pcap-filter(7)` man page

## Issues Found
- The RFC default values were incorrect. The post listed `MaxRtrAdvInterval` as `200s`, and the “RFC Defaults” example used `MinRtrAdvInterval 33`, `MaxRtrAdvInterval 100`, and `AdvDefaultLifetime 300`. RFC 4861 defines defaults of `600s`, `0.33 * MaxRtrAdvInterval` (198 seconds when Max is 600), and `3 * MaxRtrAdvInterval` (1800 seconds). I updated the table and the example to match.
- The router lifetime range and constraint were too broad for an RFC 4861 framing. The post said `AdvDefaultLifetime` ranged from `0–65535s` and only had to be at least `MaxRtrAdvInterval`. RFC 4861 requires it to be `0` or between `MaxRtrAdvInterval` and `9000` seconds. I corrected both the table and the constraints section.
- The “RFC Defaults” example used non-default prefix lifetimes (`86400` and `14400`) even though the section was labeled as RFC defaults. I changed them to the RFC 4861 defaults of `2592000` and `604800`.
- Two example IPv6 prefixes were syntactically invalid because they used non-hex text (`iot` and `specific`) in the address. I replaced them with valid documentation-prefix examples.
- The sequence diagram claimed a Router Advertisement response to a Router Solicitation was immediate and implied a host would retry RS after a default-router expiry. RFC 4861 requires a response delay of up to `MAX_RA_DELAY_TIME`, and it does not define RS retry simply because a default-router lifetime expires. I corrected the response wording and removed the retry claim.
- The Linux monitoring section overstated the `ip` output and used a `grep` that could miss normal lowercase `tcpdump` output. I qualified the `expires` note to RA-learned default routes and made the packet-capture filter output match more reliably with `grep -Ei`.

## Review Notes
- `radvd` allows some values beyond the base RFC 4861 limits in its implementation and documentation, but this post presents the settings as RFC constraints, so the corrected text now stays aligned with RFC 4861.
- Route Information Options are defined in RFC 4191. The example with `AdvDefaultLifetime 0` is technically valid, but effective client behavior still depends on host support for RFC 4191 route processing.
