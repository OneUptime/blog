# Validation Summary: How to Troubleshoot EC2 Network Connectivity Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon EC2
- Amazon VPC
- AWS CLI
- Security groups
- Network ACLs
- Route tables
- Internet gateways
- NAT gateways
- Elastic IP addresses
- VPC Reachability Analyzer
- Linux firewall and socket inspection tools

## Sources Consulted
- AWS CLI Command Reference: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon EC2 User Guide: Security groups for EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- Amazon VPC User Guide: Network ACLs - https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_ACLs.html
- Amazon VPC User Guide: Custom network ACLs and ephemeral ports - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS CLI Command Reference: describe-route-tables - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- Amazon VPC User Guide: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Amazon VPC User Guide: Internet gateways and public IPv4 requirements - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS CLI Command Reference: create-network-insights-path - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-insights-path.html
- AWS CLI Command Reference: start-network-insights-analysis - https://docs.aws.amazon.com/cli/latest/reference/ec2/start-network-insights-analysis.html
- AWS CLI Command Reference: describe-network-insights-analyses - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-insights-analyses.html

## Issues Found
- The security group explanation implied statefulness only applies to inbound-initiated flows. Updated it to cover both responses to allowed inbound traffic and responses to allowed outbound traffic.
- The NACL ephemeral-port explanation said return traffic "goes out on" a random ephemeral port. Updated it to clarify that the response leaves for the client's ephemeral destination port.
- The route-table lookup only handled explicit subnet route-table associations. Added the main route-table fallback because subnets without explicit associations are implicitly associated with the VPC main route table.
- The public IP guidance implied a NAT gateway was an alternative for direct inbound connectivity. Updated it to distinguish direct inbound internet access from outbound-only private subnet access through NAT.
- The Reachability Analyzer example started an analysis but then used a placeholder analysis ID. Updated it to capture the returned NetworkInsightsAnalysisId and use it in the describe command.
- The diagnostic script had the same explicit-only route-table lookup issue. Updated it to fall back to the VPC main route table.

## Review Notes
AWS CLI was not installed in the local environment, so command validation was performed against the current official AWS CLI command reference and AWS service documentation. The examples remain illustrative and use placeholder resource IDs; users must replace them with resources from their own account and region.
