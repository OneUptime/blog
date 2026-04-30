# Validation Summary: How to Filter ICMPv6 Following RFC 4890

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6
- RFC 4890
- RFC 4443
- RFC 4861 Neighbor Discovery
- `ip6tables`
- `nftables`

## Sources Consulted
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls": https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://www.rfc-editor.org/rfc/rfc4861
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Netfilter `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- Netfilter `iptables-extensions` man page (`icmpv6` match syntax): https://ipset.netfilter.org/iptables-extensions.man.html
- Local CLI help: `ip6tables -p icmpv6 -h`
- Local CLI help: `nft describe icmpv6 type`

## Issues Found
- The RFC summary block overstated RFC 4890 by treating all of Types 3 and 4 as blanket "should not filter" traffic, even though RFC 4890 distinguishes specific Time Exceeded and Parameter Problem codes. I corrected the summary to reflect the actual type/code guidance.
- The RFC summary incorrectly grouped Redirect (Type 137) as something that should simply be allowed on local links. RFC 4890 treats Redirect on local interfaces as an explicit policy decision, so I corrected that wording.
- The RFC summary incorrectly labeled Type 149 as traffic that "should be filtered (dangerous)." RFC 4890 groups SEND Certificate Path messages with local-link traffic, so I corrected that classification.
- The transit `ip6tables` example claimed everything else was dropped by the default policy, but it never set the `FORWARD` default policy to `DROP`. I added `sudo ip6tables -P FORWARD DROP`.
- The transit `ip6tables` example said it was starting with a clean slate "for ICMPv6," but `-F INPUT`, `-F OUTPUT`, and `-F FORWARD` flush all rules in those chains. I corrected the comment to match what the commands actually do.
- The transit `ip6tables` example labeled its error-message rules as RFC 4890 Section 4.3.1 while matching whole Types 3 and 4. I changed the example to use explicit type/code matches that line up with RFC 4890 Sections 4.3.1 and 4.3.2.
- The host-firewall `ip6tables` example only allowed inbound Echo Request and outbound Echo Reply, which did not fully "allow ping6" for both initiating and responding. I added the missing Echo Reply input rule and Echo Request output rule.
- The `nftables` example accepted `nd-redirect` on input even though Redirect is a separate policy decision in RFC 4890. I removed it from the blanket input allow-list.
- The `nftables` example dropped forwarded NDP traffic but omitted `nd-redirect` from the forward drop rule. I added it.
- The `nftables` example had a `forward` chain with `policy drop` but did not allow forwarded Echo Request / Echo Reply traffic, which would block diagnostic ping traffic through the transit firewall. I added echo types to the forward allow-list.
- The `nftables` example had an `input` chain with `policy drop` but did not allow inbound Echo Reply traffic or MLD traffic. I expanded the input rules accordingly.
- The conclusion overstated RFC 4890 by saying to allow all four error-message types at all boundary types. I corrected the conclusion to describe the specific Type 3 / Type 4 code guidance and the Redirect policy caveat.

## Review Notes
- The examples are technically correct after the fixes, but they remain illustrative allow-lists rather than full production firewall policies.
- The host-firewall snippet still assumes `OUTPUT` is not being comprehensively filtered except for the specific echo examples shown. If a deployment also sets a default-drop `OUTPUT` policy, the same local-link ICMPv6 allowances would need to be mirrored there as appropriate.
