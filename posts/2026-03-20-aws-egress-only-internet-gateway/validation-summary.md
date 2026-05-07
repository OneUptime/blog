# Validation Summary: How to Use AWS Egress-Only Internet Gateway for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS VPC
- AWS Egress-Only Internet Gateway
- IPv6 networking
- AWS CLI
- Terraform AWS Provider
- AWS Security Groups

## Sources Consulted
- AWS VPC User Guide: Egress-only internet gateways - https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- AWS CLI Command Reference: `create-egress-only-internet-gateway` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-egress-only-internet-gateway.html
- AWS CLI Command Reference: `create-route` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS VPC User Guide: Internet gateways - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Terraform Registry: `aws_egress_only_internet_gateway` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/egress_only_internet_gateway
- Terraform Registry: `aws_route_table` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform Registry: `aws_security_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The description said EIGW blocks "all inbound IPv6 traffic." I changed this to "blocking unsolicited inbound IPv6 connections from the internet" because EIGW is stateful and allows response traffic for connections initiated from inside the subnet.
- The Internet Gateway comparison said it "allows both inbound and outbound IPv6 connections" and that external hosts "CAN initiate connections" without qualification. I changed this to note that inbound initiation depends on routes and security controls, which is the technically accurate AWS behavior.
- The test example referred to a "private IPv6 address." I changed this to "the instance's IPv6 address" because AWS VPC IPv6 addresses are globally unique; the lack of inbound internet reachability here comes from the EIGW path, not from the address being private.

## Review Notes
- The AWS CLI examples and Terraform resource/block names are current and syntactically correct as written.
- The cost comparison is accurate at a high level: Egress-only internet gateways have no hourly gateway charge, while NAT gateways are billed hourly and per GB processed.
