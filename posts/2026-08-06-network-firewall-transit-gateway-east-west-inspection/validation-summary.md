# Validation Summary: Symmetric East-West Inspection with Network Firewall and Transit Gateway

## Status

validated

## Post Type

Architecture and implementation guide

## Technologies Covered

- AWS Network Firewall
- AWS Transit Gateway
- Transit Gateway network function attachments
- Centralized inspection VPCs
- Transit Gateway appliance mode
- Amazon VPC route tables and Transit Gateway route tables
- Suricata-compatible stateful rules and rule variables
- AWS CLI
- AWS Network Manager Route Analyzer
- Network Firewall, Transit Gateway, and VPC logging and monitoring

## Sources Consulted

- [Transit gateway-attached firewalls in AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/tgw-firewall.html)
- [Considerations for transit gateway-attached firewalls](https://docs.aws.amazon.com/network-firewall/latest/developerguide/tgw-firewall-considerations.html)
- [Route traffic through an AWS Transit Gateway network function attachment](https://docs.aws.amazon.com/vpc/latest/tgw/route-traffic-nf-attachment.html)
- [AWS Transit Gateway network function attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-nf-fw.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Avoiding asymmetric routing with AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/asymmetric-routing.html)
- [Transit gateway attachment configuration for AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/vpc-config-tgw-multi-az.html)
- [AWS CLI `create-transit-gateway-route` command reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway-route.html)
- [Limitations and caveats for stateful rules in AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/suricata-limitations-caveats.html)
- [Stateful domain list rule groups in AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-groups-domain-names.html)
- [How AWS Network Firewall filters network traffic](https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-policy-processing.html)
- [Logging network traffic from AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-logging.html)
- [CloudWatch metrics in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html)
- [Route Analyzer for AWS Network Manager](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [Why and how to migrate to a Transit Gateway-attached AWS Network Firewall](https://aws.amazon.com/blogs/security/why-and-how-to-migrate-to-a-transit-gateway-attached-aws-network-firewall/)

## Issues Found

- The direct network function attachment procedure omitted the post-inspection routing step. Added the requirement to associate the firewall attachment with a Transit Gateway route table containing routes to the final spoke attachments, and clarified how pre- and post-inspection route tables are used.
- The CLI examples used `tgw-attach-firewall0123456`, which is not a structurally valid Transit Gateway attachment ID because the suffix contains non-hexadecimal characters. Replaced it with the valid example form `tgw-attach-0123456789abcdef0`. The command name and flags were otherwise current and correct.
- The rule-variable example defined only `HOME_NET`. Clarified the documented `EXTERNAL_NET` inheritance behavior, the need to set both variables when a rule group overrides policy variables, and the fact that `$HOME_NET -> $EXTERNAL_NET` does not match east-west traffic when both spokes are members of `HOME_NET`.
- The inspection VPC route table incorrectly claimed that `10.10.0.0/15` covers `10.10.0.0/16` and `10.20.0.0/16`. Replaced it with individual `/16` routes in each zone because `10.10.0.0/15` covers `10.10.0.0/16` and `10.11.0.0/16`, not `10.20.0.0/16`.
- The migration procedure implied that a separate network function attachment is created in every Availability Zone. Clarified that one Transit Gateway network function attachment spans the Availability Zones configured on the transit gateway-attached firewall.
- The conclusion implied that only the inspection VPC model uses a post-inspection Transit Gateway route table. Updated it to state the post-inspection routing responsibility for the direct attachment model as well.

## Review Notes

- The documented Transit Gateway appliance-mode propagation prerequisite, route-selection behavior, spoke VPC routing requirements, stateless-rule symmetry warning, logging limitations, monitoring metrics, and Route Analyzer limitations were verified as current.
- Native Transit Gateway attachment availability and supported capabilities remain Region- and feature-dependent, so the post correctly directs readers to evaluate those requirements rather than assuming universal support.
- No deprecated commands or version-specific APIs are used. The AWS CLI command syntax matches the current AWS CLI v2 reference.
