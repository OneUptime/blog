# Validation Summary: Direct Connect Gateway to Transit Gateway: Prefixes, BGP, and Routes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Direct Connect
- AWS Direct Connect Gateway
- AWS Transit Gateway
- Transit virtual interfaces
- Border Gateway Protocol (BGP)
- Amazon VPC routing
- VPC Flow Logs and Transit Gateway Flow Logs
- Amazon CloudWatch metrics
- AWS hybrid networking pricing

## Sources Consulted
- [Direct Connect gateways](https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways-intro.html)
- [Direct Connect virtual interfaces and hosted virtual interfaces](https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html)
- [Create a transit virtual interface to the Direct Connect gateway](https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-transit-vif-for-gateway.html)
- [Long ASN support in Direct Connect](https://docs.aws.amazon.com/directconnect/latest/UserGuide/long-asn-support.html)
- [AWS Direct Connect support for 4-byte Autonomous System numbers for virtual interfaces](https://aws.amazon.com/about-aws/whats-new/2025/09/aws-direct-connect-4-byte-autonomous-system-numbers/)
- [Allowed prefixes interactions for Direct Connect gateways](https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html)
- [Direct Connect routing policies and BGP communities](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html)
- [Associate or disassociate Direct Connect with a Transit Gateway](https://docs.aws.amazon.com/directconnect/latest/UserGuide/associate-tgw-with-direct-connect-gateway.html)
- [Create a Transit Gateway and Direct Connect association proposal](https://docs.aws.amazon.com/directconnect/latest/UserGuide/multi-account-tgw-create-proposal.html)
- [Accept or reject a Transit Gateway and Direct Connect association proposal](https://docs.aws.amazon.com/directconnect/latest/UserGuide/multi-account-tgw-accept-reject-proposal.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [Monitor Direct Connect with Amazon CloudWatch](https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html)
- [AWS Direct Connect pricing](https://aws.amazon.com/directconnect/pricing/)
- [AWS Transit Gateway pricing](https://aws.amazon.com/transit-gateway/pricing/)

## Issues Found
- The ASN section stated the required difference between the Transit Gateway and Direct Connect gateway ASNs but omitted the separate virtual-interface constraint. Added that the customer router peer ASN must also differ from the Direct Connect gateway ASN, as required by the Direct Connect virtual-interface documentation.
- The Transit Gateway route-precedence list called the sixth attachment type "private Direct Connect VPN-propagated routes." Replaced it with AWS's documented term, "Site-to-Site VPN over private Direct Connect-propagated routes," to identify the attachment type unambiguously.
- The ECMP condition required only an equal prefix length, which could incorrectly include different destination networks. Changed it to require the same destination prefix, along with equal AS path length and BGP attributes, matching the Direct Connect routing requirements.

## Review Notes
The post contains no executable code or CLI examples, but it provides detailed, actionable network configuration guidance, so it was reviewed as a technical guide rather than classified as a non-code blog. Pricing statements were verified against the AWS pricing pages as of 2026-08-06; readers should continue to retrieve current Regional rates when estimating costs, as the post advises.
