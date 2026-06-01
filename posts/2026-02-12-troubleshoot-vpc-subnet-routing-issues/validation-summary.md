# Validation Summary: How to Troubleshoot VPC Subnet Routing Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon VPC
- VPC route tables
- Internet gateways
- NAT gateways
- VPC peering
- Security groups
- Network ACLs
- VPC Reachability Analyzer
- VPC Flow Logs
- AWS CLI
- Amazon CloudWatch Logs Insights

## Sources Consulted
- AWS CLI Command Reference: describe-route-tables - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: create-network-insights-path - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-insights-path.html
- AWS CLI Command Reference: create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon VPC User Guide: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Amazon VPC User Guide: Replace or restore the target for a local route - https://docs.aws.amazon.com/vpc/latest/userguide/replace-local-route-target.html
- Amazon VPC User Guide: Enable internet access using an internet gateway - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC User Guide: NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- Amazon VPC Peering Guide: Update route tables for a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html
- Amazon VPC Peering Guide: Enable DNS resolution for a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- Amazon VPC User Guide: Network ACLs - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- Amazon VPC User Guide: VPC Flow Logs - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
- Amazon CloudWatch Logs User Guide: Supported logs and discovered fields - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- Amazon CloudWatch Logs User Guide: Sample Logs Insights queries - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html

## Issues Found
- The VPC Flow Logs AWS CLI command used `aws ec2 create-flow-log`, but the current AWS CLI command is `aws ec2 create-flow-logs`. Updated the command.
- The introduction said symptoms are always the same. Routing and filtering failures commonly present as timeouts or unreachable hosts, while connection refused can indicate a reachable host with no listening service. Softened the wording to avoid overgeneralizing.
- The local route explanation said only that the local route cannot be deleted. AWS also supports replacing and restoring the target for local routes in advanced routing scenarios. Added that nuance.
- The Flow Logs section described logs as packet-level data. VPC Flow Logs capture flow-level metadata, not packet payloads or a packet capture. Updated the wording.
- The Flow Logs troubleshooting explanation implied a strict packets-arrive-versus-never-arrive distinction. Updated it to describe traffic records and expected interfaces more accurately.

## Review Notes
AWS CLI was not installed in the local workspace, so command verification was performed against the current official AWS CLI command reference and AWS service documentation. The remaining AWS CLI examples use documented command names, filters, query fields, and option names. The Reachability Analyzer example uses `--protocol TCP`, which is shown in the official AWS CLI examples and normalizes to `tcp` in output.
