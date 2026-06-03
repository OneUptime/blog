# Validation Summary: How to Configure Direct Connect with Transit Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Direct Connect
- AWS Direct Connect Gateway
- AWS Transit Gateway
- AWS Site-to-Site VPN
- AWS CLI
- BGP
- Cisco IOS router configuration
- Amazon CloudWatch

## Sources Consulted
- AWS CLI Command Reference: create-direct-connect-gateway - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-direct-connect-gateway.html
- AWS CLI Command Reference: create-direct-connect-gateway-association - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-direct-connect-gateway-association.html
- AWS CLI Command Reference: create-transit-virtual-interface - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-transit-virtual-interface.html
- AWS Direct Connect User Guide: Direct Connect gateways and transit gateway associations - https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html
- AWS Direct Connect User Guide: Allowed prefixes interactions - https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html
- AWS Direct Connect User Guide: Virtual interface MTUs - https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html
- Amazon VPC Transit Gateways Guide: How transit gateways work and route evaluation order - https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS Site-to-Site VPN User Guide: Route priority - https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-route-priority.html
- AWS Direct Connect User Guide: Monitor with Amazon CloudWatch - https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html

## Issues Found
- The Direct Connect gateway Amazon-side ASN explanation only listed the 16-bit private ASN range. Updated it to include the AWS-supported 32-bit private ASN range, 4200000000-4294967294.
- The transit virtual interface examples omitted the BGP address family field. Added `"addressFamily": "ipv4"` to match AWS CLI's documented transit VIF input shape.
- The VPN backup section said Direct Connect is preferred because it has a shorter AS path than VPN. For Transit Gateway route tables, AWS documents Direct Connect gateway propagated routes as preferred over Site-to-Site VPN propagated routes for matching prefixes. Updated the explanation accordingly.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI reference and AWS service documentation. The two internal OneUptime links returned HTTP 200.
