# Validation Summary: How to Create NAT Gateways with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- AWS NAT Gateway
- AWS Internet Gateway
- AWS Elastic IP / public IPv4 addressing
- AWS CloudWatch metrics and alarms
- AWS VPC Flow Logs
- Terraform AWS provider
- HCL configuration

## Sources Consulted
- AWS VPC User Guide: NAT gateways, public vs private NAT gateways, Elastic IP requirements, and traffic translation path: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC User Guide: NAT gateway basics, connection limits, bandwidth, packet limits, and port allocation behavior: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS VPC User Guide: NAT gateway pricing guidance and cost reduction strategies: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Amazon VPC Pricing: NAT Gateway hourly/data processing charges and public IPv4 address charges: https://aws.amazon.com/vpc/pricing/
- AWS VPC User Guide: public IPv4 address charging: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
- AWS VPC User Guide: NAT Gateway CloudWatch metrics and dimensions: https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html
- AWS VPC User Guide: creating CloudWatch alarms for NAT Gateway metrics: https://docs.aws.amazon.com/vpc/latest/userguide/creating-alarms-nat-gateway.html
- Terraform Registry, HashiCorp AWS provider: aws_nat_gateway resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform Registry, HashiCorp AWS provider: aws_eip resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform Registry, HashiCorp AWS provider: aws_route_table and aws_route_table_association resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform Registry, HashiCorp AWS provider: aws_cloudwatch_metric_alarm resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform Registry, HashiCorp AWS provider: aws_flow_log resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log

## Issues Found
- The traffic-flow explanation said the NAT Gateway directly translates the instance private IP to its Elastic IP. AWS documents the public NAT gateway path more precisely: the NAT gateway maps the source private IPv4 address to the NAT gateway private IPv4 address, then the internet gateway maps that to the associated Elastic IP for internet-bound traffic. Updated the sentence to match AWS documentation.
- The cost section said Elastic IPs are free while attached to a running NAT Gateway. This is outdated. AWS now charges for public IPv4 addresses, including Elastic IP addresses attached to resources such as NAT Gateways. Updated the cost section to call out the separate public IPv4 charge.
- The cost section presented example NAT Gateway rates as universal. Updated the wording to identify them as rate-based examples and mention that pricing varies by region.
- The monitoring section said the sample alarms alert on connection drops, but the second alarm monitors `ErrorPortAllocation`. Updated the wording to "port allocation errors."

## Review Notes
The Terraform snippets use current AWS provider resource names and arguments, including `aws_eip.domain = "vpc"`, `aws_nat_gateway.allocation_id`, route table `nat_gateway_id`, `aws_cloudwatch_metric_alarm`, and `aws_flow_log` with a CloudWatch Logs destination. Terraform CLI was not installed in the local environment, so I could not run `terraform validate`; the review was performed against official AWS and Terraform provider documentation.
