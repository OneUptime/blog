# Validation Summary: How to Understand Public vs Private IPv4 Addresses

## Status
validated

## Post Type
Guide / explainer

## Technologies Covered
- IPv4 addressing
- Private IPv4 address space (`RFC 1918`)
- NAT / NAPT
- Python `ipaddress`
- IPv6 addressing
- Cloud VM public/private IP assignment

## Sources Consulted
- RFC 1918, Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- RFC 3022, Traditional IP Network Address Translator (Traditional NAT): https://datatracker.ietf.org/doc/html/rfc3022
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737
- RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space: https://datatracker.ietf.org/doc/rfc6598/
- IANA IPv4 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4864, Local Network Protection for IPv6: https://www.rfc-editor.org/rfc/rfc4864
- RFC 2827 / BCP 38, Network Ingress Filtering: https://datatracker.ietf.org/doc/html/rfc2827
- Amazon EC2 instance IP addressing: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- Azure private IP addresses: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/private-ip-addresses

## Issues Found
- The table and NAT diagram used `203.0.113.0/24` addresses as examples of public internet-routable IPs. That block is reserved for documentation by RFC 5737 and is not globally reachable. I replaced those examples with real public-address examples.
- The description said private addresses "require NAT" to reach the internet. RFC 1918 is stricter about lacking direct external IP connectivity, but access can also happen through mediating gateways. I reworded this to "typically use NAT or another gateway to reach the internet."
- The address-exhaustion section claimed NAT lets "millions of devices" share a single public IP. That overstates what a single IPv4 address can support in practice. I changed this to "many devices" and clarified that smaller pools of public IPs are also commonly shared.
- The cloud bullet implied each cloud VM typically has both private and public IPs. Current AWS and Azure documentation treat public IPv4 assignment as optional. I reworded this to say cloud VMs typically have a private IP and may also have a public IP.
- The IPv6 takeaway said IPv6 "eliminates NAT." RFC 4864 supports the narrower claim that IPv6 removes NAT's address-conservation necessity, not that translation can never exist. I reworded this to "largely removes the need for NAT for address conservation."
- The final bullet said ISPs drop RFC 1918-sourced packets. RFC 1918 and BCP 38 support filtering expectations, but the original wording was too absolute. I reworded it to say leaked RFC 1918 routes and traffic are typically filtered at network edges.
- The Python sample tested `203.0.113.5`, which is a documentation-only address and could confuse readers in a public-vs-private example. I replaced it with `1.1.1.1` and re-ran the snippet locally.

## Review Notes
Python's `ipaddress.IPv4Address.is_global` follows the IANA special-purpose registries. Per the Python docs, `100.64.0.0/10` is a notable exception where `is_global` and `is_private` are both `False`; the sample keeps `100.64.0.1` as a useful edge case. No other technical issues found.
