# Validation Summary: Direct Connect with VPN Backup Through Transit Gateway

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- AWS Transit Gateway
- AWS Direct Connect and Direct Connect gateways
- AWS Site-to-Site VPN, including internet-routed and private-IP VPN connections
- Border Gateway Protocol (BGP)
- Amazon VPC route tables and Transit Gateway route tables
- AWS CLI
- Amazon CloudWatch metrics and VPN tunnel logs
- Transit Gateway Flow Logs and VPC Flow Logs

## Sources Consulted

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateway route tables in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Direct Connect routing policies and BGP communities](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html)
- [Allowed prefixes interactions for Direct Connect gateways](https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html)
- [Private IP AWS Site-to-Site VPN with Direct Connect](https://docs.aws.amazon.com/vpn/latest/s2svpn/private-ip-dx.html)
- [AWS CLI `search-transit-gateway-routes` command reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html)
- [Monitor Direct Connect with Amazon CloudWatch](https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html)
- [Monitor AWS Site-to-Site VPN tunnels using Amazon CloudWatch](https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html)
- [AWS Site-to-Site VPN logs](https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-logs.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [VPC Flow Logs basics](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-basics.html)
- [RFC 4271: A Border Gateway Protocol 4 (BGP-4)](https://www.rfc-editor.org/rfc/rfc4271)

## Issues Found

- The post said every attachment is associated with exactly one Transit Gateway route table. An attachment can be associated with at most one route table and can be left unassociated. The wording now states that an attachment can be associated with only one route table.
- The failover procedure withdrew only the Direct Connect BGP advertisement. Withdrawing only the on-premises prefixes sent to AWS can move the AWS-to-on-premises path without removing the customer router's Direct Connect route to AWS. The procedure now shuts down the relevant Direct Connect BGP peering while leaving the circuit up, which withdraws learned routes on both sides and exercises symmetric failover.
- The flow-log sentence blurred the capabilities of Transit Gateway Flow Logs and VPC Flow Logs. It now distinguishes Transit Gateway attachment and packet-loss information from the network-interface-level `ACCEPT` or `REJECT` behavior reported by VPC Flow Logs.

## Review Notes

- The AWS CLI command and `route-search.exact-match` filter syntax are current and valid. The resource ID and CIDR are intentionally illustrative and must be replaced with values from the target environment.
- The Direct Connect and VPN CloudWatch metric names in the post match the current AWS documentation.
- The documentation links in the post resolve to the relevant current AWS documentation pages.
- The post appropriately avoids promising a universal convergence time; actual interruption depends on BGP, tunnel detection, device, route-scale, and application behavior.
