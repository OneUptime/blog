# Validation Summary: How to Allow Essential ICMPv6 Through a Firewall

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6 Neighbor Discovery (NDP)
- Multicast Listener Discovery (MLD)
- `ip6tables`
- `nftables`
- `firewalld`

## Sources Consulted
- `ip6tables` built-in help output from the review environment: `ip6tables -p icmpv6 -h`
- `nft` built-in type listing from the review environment: `nft describe icmpv6 type`
- RFC 4443: ICMPv6 for IPv6 Specification: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861: Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- Netfilter `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- firewalld `firewall-cmd` man page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld `firewalld.policies` documentation: https://firewalld.org/documentation/man-pages/firewalld.policies.html
- firewalld official article on `allow-host-ipv6`: https://firewalld.org/2020/09/policy-objects-introduction

## Issues Found
- The original `ip6tables` note suggested `sudo ip6tables -F` as a way to clear ICMPv6 rules, but `-F` flushes the entire filter table. I changed the note to warn about that behavior instead of implying it only affects ICMPv6 rules.
- The host `ip6tables` example allowed Echo in only one direction and omitted host-generated ICMPv6 error output rules. I added the missing `echo-request`/`echo-reply` directions and the missing outbound error-message rules so the example matches its stated host-firewall purpose.
- The MLD comment said it was "required for SLAAC to work". RFC 4862 is narrower than that: it specifically calls out MLD reporting during Duplicate Address Detection to inform MLD-snooping switches. I corrected the wording to avoid overstating the requirement.
- The host `ip6tables` example allowed outbound MLD Reports and MLDv2 Reports but omitted outbound MLD Done (`132`). I added that missing rule for consistency with MLD listener behavior.
- The nftables section was labeled as a complete host configuration even though it only modeled ICMPv6 handling. I corrected the scope by turning it into an explicit ICMPv6-focused example, made the default `accept` policy explicit, and added the missing `output` chain so inbound and outbound essential ICMPv6 are both covered.
- The firewalld section used `--query-icmp-block-inversion` as if it verified that ICMPv6 was allowed by default. Per firewalld documentation, that command only reports whether inversion is enabled. I rewrote the block to separately inspect ICMP blocks, check inversion, and verify the built-in `allow-host-ipv6` policy.

## Review Notes
- The post remains a practical allow-list guide rather than a full RFC 4890 policy matrix. That is fine, but production firewalls may also add hop-limit and source-scope checks for local-link ICMPv6 such as NDP and MLD.
- RFC 4890 treats ICMPv6 Redirect (`Type 137`) as a policy decision rather than an unconditional allow. The post does not include Redirect rules, which is acceptable for this scope.
- `ip6tables` is still valid and the reviewed syntax matches current CLI help in this environment, but `nftables` is the more modern native interface on current Linux systems.
- `firewall-cmd` was not installed in the review environment, so firewalld verification was done against official firewalld documentation rather than local CLI output.
- `nft -c` could not be used for a local syntax check in this environment because netlink cache initialization was not permitted, so nftables validation relied on the official man page plus local symbolic-type inspection.
