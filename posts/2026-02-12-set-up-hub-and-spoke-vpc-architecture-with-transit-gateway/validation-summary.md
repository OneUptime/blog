# Validation Summary: How to Set Up Hub-and-Spoke VPC Architecture with Transit Gateway

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Transit Gateway
- Amazon VPC
- VPC peering
- AWS Site-to-Site VPN
- AWS Direct Connect gateway attachments
- Transit Gateway route tables, associations, and propagation
- AWS CLI for EC2 networking
- Transit Gateway Flow Logs
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: create-transit-gateway: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway.html
- AWS Transit Gateway quotas: https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html
- AWS Transit Gateway VPC attachments: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS Transit Gateway route tables and routing behavior: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS Transit Gateway design best practices: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html
- AWS Transit Gateway Flow Logs CLI guidance: https://docs.aws.amazon.com/vpc/latest/tgw/flow-logs-api-cli.html
- AWS VPC peering basics and limitations: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- AWS VPC peering quotas: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-connection-quotas.html
- AWS Transit Gateway pricing: https://aws.amazon.com/transit-gateway/pricing/
- Terraform AWS provider documentation for Transit Gateway resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The DnsSupport explanation was too broad. AWS Transit Gateway DNS support does not automatically make all private DNS, including Route 53 private hosted zones, resolve across attached VPCs. Updated the text to clarify that it supports Amazon-provided public DNS hostnames resolving to private IP addresses where supported, while private hosted zones still need private hosted zone associations or Route 53 Resolver rules.
- The production VPC route-table example added a route to `10.1.0.0/16`, which conflicted with the stated segmentation goal that production should not reach development. Updated the example to route production to an allowed security/monitoring CIDR instead.
- The Transit Gateway Flow Logs example used `aws ec2 create-flow-log`, but the AWS CLI command is `create-flow-logs`. Updated the command name.
- The Transit Gateway Flow Logs example passed `--traffic-type ALL`. AWS documentation says `--traffic-type` should not be provided for Transit Gateway resource types. Removed the option.
- The cost section presented example pricing as general pricing. Updated it to state that pricing varies by Region and that the listed values are example Region values.

## Review Notes
The remaining CLI and Terraform examples use placeholder IDs, which is appropriate for a tutorial. In a production guide, the article could improve by showing how to capture created Transit Gateway route table and attachment IDs from command output before using them in later commands.
