# Validation Summary: Centralized Internet Egress with Transit Gateway and NAT Gateway

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered

- Amazon Virtual Private Cloud (Amazon VPC)
- AWS Transit Gateway
- Amazon VPC public and Regional NAT Gateway
- Internet gateways and Elastic IP addresses
- VPC endpoints and AWS PrivateLink
- AWS Network Firewall and Transit Gateway appliance mode
- Transit Gateway Flow Logs, VPC Flow Logs, and Amazon CloudWatch metrics
- AWS networking cost allocation

## Sources Consulted

- [AWS Transit Gateway centralized outbound internet routing](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html#tgw-centralized-router)
- [Using the NAT gateway for centralized IPv4 egress](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/using-nat-gateway-for-centralized-egress.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [NAT gateway basics](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html)
- [Example VPC routing options](https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html#route-tables-nat)
- [Regional NAT gateways for automatic multi-AZ expansion](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html)
- [AWS Transit Gateway pricing](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [Gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html)
- [Avoiding asymmetric routing with AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/asymmetric-routing.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [NAT gateway metrics and dimensions](https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html)
- [Internet gateways](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html)
- [RFC 5737: IPv4 Address Blocks Reserved for Documentation](https://datatracker.ietf.org/doc/html/rfc5737)

## Issues Found

- The spoke-ingress Transit Gateway route table omitted blackhole routes for the spoke CIDRs while claiming that withholding propagated spoke routes isolated the spokes. Because the table still had a default route to the egress VPC, private spoke-to-spoke destinations could fall through that default route. Added static blackhole routes for `10.10.0.0/16` and `10.20.0.0/16`, and clarified that both the blackholes and the separate propagation policy are required for the stated isolation behavior. This matches AWS's centralized-egress guidance to use more-specific blackhole routes when inter-VPC communication must be prevented.

## Review Notes

- The routing tables and packet-flow snippets are conceptual configuration examples rather than executable code or CLI commands.
- The conventional public NAT Gateway design correctly uses one zonal NAT gateway and one Transit Gateway attachment subnet per supported Availability Zone. Regional NAT Gateway is accurately identified as a separate resource model with automatic multi-AZ expansion and its own route table; availability, expansion behavior, and per-AZ billing should be rechecked when deploying.
- The cost discussion correctly treats Transit Gateway attachment and data-processing charges, NAT Gateway hourly and processing charges, internet data transfer, cross-zone transfer where applicable, and public IPv4 charges as distinct inputs.
- `198.51.100.40` is within the RFC 5737 TEST-NET-2 documentation prefix and is appropriate for the illustrative packet trace; it is not a live test endpoint.
- All seven links in the post's Official Documentation section returned HTTP 200 during validation.
