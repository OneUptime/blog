# Validation Summary: How to Configure DHCP Scopes and Address Pools

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- ISC DHCP (`dhcpd`)
- `dnsmasq`
- IPv4 subnetting and address pool planning
- Python `ipaddress`

## Sources Consulted
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- dnsmasq upstream man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762
- IANA example domains guidance: https://www.iana.org/help/example-domains

## Issues Found
- The `dnsmasq` example used a legacy/undocumented pattern that embedded a network identifier directly in `dhcp-range` and `dhcp-option`. I changed it to the documented `set:`/`tag:` form from the upstream man page so the example matches current official syntax guidance.
- The `dhcpd` comment above `option tftp-server-name` described the value as a call manager IP. I changed the comment to identify it correctly as a TFTP server setting, which is what option 66 represents in ISC DHCP.
- The example domain `office.example.local` used the `.local` suffix, which RFC 6762 reserves for Multicast DNS. I changed it to `office.example.com`, which is appropriate for documentation examples.
- The pool-sizing guidance stated that administrators should always reserve 20% of addresses for static use. I changed this to a rule-of-thumb framing because DHCP does not require a fixed 20% reserve; pool sizing depends on actual static allocation and growth needs.
- The lease-duration explanation said shorter leases make IPs "returned faster." I tightened this to say they reclaim abandoned addresses faster, which better matches DHCP lease behavior in RFC 2131.
- The final overlap guidance was too narrow because overlap is about address ranges, not specifically "different subnets." I changed it to say dynamic ranges should not overlap and each scope should match the intended subnet.

## Review Notes
- No syntax errors were found in the Python example.
- The updated `dnsmasq` configuration was syntax-checked locally with `dnsmasq --test`.
- In `dnsmasq`, the DNS server option defaults to the address of the machine running `dnsmasq` unless `option:dns-server` is set explicitly; this post only overrides the router option in that example.
- ISC DHCP itself is end-of-life according to ISC, but the `dhcpd.conf` syntax used here remains valid for legacy deployments.
