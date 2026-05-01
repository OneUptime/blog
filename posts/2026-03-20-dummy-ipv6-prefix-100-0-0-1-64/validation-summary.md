# Validation Summary: How to Understand the Dummy IPv6 Prefix (100:0:0:1::/64) - 100

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv6 special-purpose address space
- IANA IPv6 registry entries
- MPLS OAM and control-plane encapsulation
- Python `ipaddress`
- Linux `iproute2` and `ping`
- Nginx upstream configuration

## Sources Consulted
- IANA IPv6 Special-Purpose Address Space: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 9780, which allocates `100:0:0:1::/64` as the Dummy IPv6 Prefix: https://www.rfc-editor.org/rfc/rfc9780
- RFC 6666, which defines `100::/64` as the Discard-Only Address Block: https://www.rfc-editor.org/rfc/rfc6666
- RFC 3849, which reserves `2001:db8::/32` for documentation: https://www.rfc-editor.org/rfc/rfc3849
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- curl man page: https://curl.se/docs/manpage.html
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Local CLI help output for `ip -6 route help` and `ping -6 -h`

## Issues Found
- The introduction and description incorrectly stated that `100:0:0:1::/64` falls within `100::/64`. I corrected this to reflect the current standards position: they are separate special-purpose `/64` prefixes, with `100:0:0:1::/64` allocated by RFC 9780 and `100::/64` defined earlier by RFC 6666.
- The Python example comments were inconsistent with the actual `ipaddress` results. I updated the comments and the example so it now correctly shows that `100:0:0:1::/64` is not a subnet of `100::/64`, and that an address from the dummy prefix belongs to the dummy prefix rather than the discard block.
- The original timeout-testing example treated `100::/64` as a generic application timeout target and implied a fixed timeout outcome. I replaced that subsection with the standards-defined use of `100:0:0:1::/64`, which RFC 9780 assigns to MPLS management, control, and OAM IP/UDP encapsulation.
- The Nginx placeholder example used `100:0:0:1::1` as a generic template address. I changed it to use `2001:db8::/32`, which is the standards-defined documentation prefix for published examples.
- The black-hole routing example was conceptually attached to the dummy prefix discussion even though black-hole routing is the defined purpose of `100::/64`. I kept the routing example but clarified that it applies to the discard-only block and updated the probe command to `ping -6`, which matches current CLI help usage.
- The documentation guidance said to always prefer `2001:db8::/32`. I softened this to “use a documentation prefix such as `2001:db8::/32`” so the advice remains correct without overstating exclusivity.

## Review Notes
- RFC 3849 remains valid for `2001:db8::/32`, but it has been updated by RFC 9637, which added additional IPv6 documentation space. The post’s example remains correct because `2001:db8::/32` is still a valid documentation prefix.
- I did not attempt live network tests for the route examples because they would require changing host routing state. The command syntax was checked against local CLI help and the standards context was verified against the RFCs and IANA registry.
