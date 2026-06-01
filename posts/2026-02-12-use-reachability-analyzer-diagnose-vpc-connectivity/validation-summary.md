# Validation Summary: How to Use Reachability Analyzer to Diagnose VPC Connectivity

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- AWS VPC Reachability Analyzer
- AWS Network Insights paths and analyses
- AWS CLI for EC2 networking
- Boto3 EC2 client
- VPC networking components: security groups, network ACLs, route tables, NAT gateways, VPC peering, transit gateways, VPC endpoints

## Sources Consulted
- AWS Reachability Analyzer overview: https://docs.aws.amazon.com/vpc/latest/reachability/what-is-reachability-analyzer.html
- AWS Reachability Analyzer behavior, supported resources, path components, and considerations: https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html
- AWS Reachability Analyzer console getting started guide: https://docs.aws.amazon.com/vpc/latest/reachability/getting-started.html
- AWS CLI `create-network-insights-path` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-insights-path.html
- AWS CLI `start-network-insights-analysis` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/start-network-insights-analysis.html
- Boto3 EC2 `create_network_insights_path` reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/create_network_insights_path.html
- AWS Reachability Analyzer quotas: https://docs.aws.amazon.com/vpc/latest/reachability/reachability-analyzer-limits.html
- Amazon VPC pricing: https://aws.amazon.com/vpc/pricing/

## Issues Found
- The console instructions pointed users to the VPC console sidebar. AWS documentation now directs users to the Network Manager console for Reachability Analyzer, so the wording was updated.
- The example treated an RDS instance as an `Instance` destination. Reachability Analyzer supports EC2 instances and network interfaces, but not RDS DB instances as a direct endpoint type. The example now uses the RDS network interface as the destination.
- The Lambda troubleshooting example implied Lambda itself is a direct endpoint. The wording now refers to the Lambda function's VPC network interface.
- The results section claimed the analyzer always shows every hop and exactly where the path breaks. AWS documents shortest-path behavior and notes that unreachable paths may have additional blocking components, so the wording was made more precise.
- Placeholder EC2 IDs in CLI and Python examples included non-hex characters. They were replaced with valid-looking EC2, ENI, path, and analysis ID placeholders.
- The Python cleanup logic skipped deletion of the created network insights path if the analysis failed. The cleanup now runs in a `finally` block.
- The supported endpoint list incorrectly included NAT gateways and used "VPN gateways" instead of the documented "virtual private gateways." The list was updated and NAT gateways were described as intermediate components.
- The quota values were outdated. The post now reflects the documented default quotas of 1,000 paths, 10,000 analyses, and 100 concurrent analyses, adjustable.

## Review Notes
The pricing statement of $0.10 per processed analysis remains accurate according to the Amazon VPC pricing page. The post is technically relevant and contains CLI and Python implementation examples, so it was reviewed as a technical tutorial.
