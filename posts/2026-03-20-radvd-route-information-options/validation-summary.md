# Validation Summary: How to Configure radvd Route Information Options

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Router Advertisements
- `radvd`
- RFC 4191 Route Information Options
- Linux IPv6 route handling
- `rdisc6`

## Sources Consulted
- RFC 4191, "Default Router Preferences and More-Specific Routes": https://datatracker.ietf.org/doc/html/rfc4191
- `radvd` official repository, `radvd.conf.5.man`: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.conf.5.man
- `radvd` official repository, `radvd.conf.example`: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.conf.example
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- NDisc6 project page (`rdisc6` tool): https://www.remlab.net/ndisc6/

## Issues Found
- Several example IPv6 prefixes were invalid literals: `2001:db8:fast::/48`, `2001:db8:normal::/48`, `2001:db8:backup::/48`, `2001:db8:corp::/48`, and `2001:db8:dmz::/48` are not syntactically valid IPv6 addresses because those hextets contain non-hex characters. I replaced them with valid documentation-prefix examples.
- The introduction said RFC 4191 advertises a prefix and its "associated next-hop". The Route Information Option does not carry a separate next-hop field; the route is implicitly via the advertising router. I corrected that wording.
- The post omitted an important Linux behavior detail for more-specific RIOs. Per Linux kernel sysctl documentation, `accept_ra_rt_info_max_plen` limits accepted Route Information prefix lengths, and the upstream `radvd.conf.example` explicitly warns that additional configuration may be needed. I added a note that Linux may ignore a `/48` route unless that sysctl is set high enough.
- The verification example hard-coded `metric 100` for an RA-installed route. That value is not fixed; route metrics learned from RA vary by system and configuration. I changed the example to show the stable part of the route output only.
- The verification text described `rdisc6` as showing the "raw" RA. `rdisc6` presents decoded router discovery information rather than a packet dump, so I corrected the wording.
- The default-route section implied `route ::/0` is the general way to control preferred default routers. RFC 4191 states that a `::/0` Route Information Option overrides the RA header only on hosts that process RIOs, while default-router preference is normally carried in the RA header. I clarified that `AdvDefaultPreference` remains the usual setting.
- The conclusion said route preferences can control "load balancing". RFC 4191 preferences guide route selection and failover, but do not by themselves guarantee load balancing behavior. I changed that statement to "route selection".

## Review Notes
- Host support for RFC 4191 more-specific routes is not uniform. The upstream `radvd` example notes that this feature is not very widely supported, and Linux behavior depends on `accept_ra_rtr_pref` and `accept_ra_rt_info_max_plen`.
- The `route ::/0` example is valid RFC 4191 behavior, but it is more specialized than setting `AdvDefaultPreference` on the Router Advertisement header.
