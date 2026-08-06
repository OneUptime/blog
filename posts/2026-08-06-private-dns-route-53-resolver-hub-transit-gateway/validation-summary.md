# Validation Summary: Private DNS Across Transit Gateway with a Resolver Hub

## Status
validated

## Post Type
Technical architecture and implementation guide

## Technologies Covered

- Amazon Route 53 VPC Resolver
- Route 53 Resolver inbound and outbound endpoints
- Route 53 Resolver forwarding rules
- Route 53 private hosted zones
- Route 53 Profiles
- AWS Transit Gateway
- AWS Resource Access Manager (AWS RAM)
- Amazon VPC DNS attributes, route tables, security groups, and network ACLs
- AWS Direct Connect and AWS Site-to-Site VPN
- DNS over UDP and TCP (Do53) and DNS over HTTPS (DoH)
- BIND `dig`

## Sources Consulted

- [What is Route 53 VPC Resolver?](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html)
- [Resolving DNS queries between VPCs and your network](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-overview-DSN-queries-to-vpc.html)
- [Forwarding inbound DNS queries to your VPCs](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-inbound-queries.html)
- [Forwarding outbound DNS queries to your network](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html)
- [Considerations when creating inbound and outbound endpoints](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-choose-vpc.html)
- [High availability for Resolver endpoints](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-resolver-endpoint-high-availability.html)
- [Managing forwarding rules](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html)
- [Considerations when working with a private hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html)
- [Associating a VPC and private hosted zone from different AWS accounts](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs-different-accounts.html)
- [Associate private hosted zones to a Route 53 Profile](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profile-associate-private-hz.html)
- [Understanding Amazon DNS](https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Resolver endpoint scaling](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-resolver-endpoint-scaling.html)
- [Control subnet traffic with network access control lists](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- [Resolver query logging](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html)
- [Values that appear in VPC Resolver query logs](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-format.html)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/v9.20.23/manpages.html#dig-dns-lookup-utility)

## Issues Found
No technical issues found.

## Review Notes
The post accurately distinguishes Transit Gateway packet routing from DNS control-plane associations. The endpoint address requirements, Regional sharing model, private hosted-zone visibility, rule precedence, cross-account association options, bidirectional routing and security requirements, supported DNS transports, target retry behavior, query logging cache behavior, and `dig` examples are consistent with the current official documentation. No version-specific APIs or deprecated configuration are used. The validation did not require changes to `README.md`.
