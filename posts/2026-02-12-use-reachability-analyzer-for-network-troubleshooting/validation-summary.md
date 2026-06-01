# Validation Summary: How to Use Reachability Analyzer for Network Troubleshooting

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- AWS VPC Reachability Analyzer
- AWS EC2 Network Insights Paths and analyses
- AWS CLI
- Boto3 for Python
- AWS CloudFormation
- Security groups, network ACLs, route tables, VPC peering, transit gateways, VPC endpoints, load balancers, NAT gateways, and AWS Network Firewall
- VPC Flow Logs

## Sources Consulted
- AWS Reachability Analyzer: How Reachability Analyzer works: https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html
- AWS Reachability Analyzer CLI getting started guide: https://docs.aws.amazon.com/vpc/latest/reachability/getting-started-cli.html
- AWS CLI `create-network-insights-path` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-insights-path.html
- AWS CLI `start-network-insights-analysis` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/start-network-insights-analysis.html
- AWS CLI `describe-network-insights-analyses` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-insights-analyses.html
- AWS CLI `authorize-security-group-ingress` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CloudFormation `AWS::EC2::NetworkInsightsPath` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-networkinsightspath.html
- AWS Reachability Analyzer explanation codes: https://docs.aws.amazon.com/vpc/latest/reachability/explanation-codes.html
- AWS Reachability Analyzer quotas: https://docs.aws.amazon.com/vpc/latest/reachability/reachability-analyzer-limits.html
- Amazon VPC pricing: https://aws.amazon.com/vpc/pricing/
- Boto3 EC2 `start_network_insights_analysis` and `describe_network_insights_analyses` references: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html

## Issues Found
- The supported resource list mixed source/destination resources with intermediate path components. I updated the list to match AWS's documented source and destination resource types and added a short note for intermediate components such as load balancers, NAT gateways, AWS Network Firewall, transit gateways, transit gateway attachments, and VPC peering connections.
- The post stated that Reachability Analyzer reports exactly where a path breaks. AWS documents that it reports the blocking component or combination of components and that there may be additional blocking components, so I made the wording less absolute.
- The example explanation codes for security groups and network ACLs used non-current or undocumented values. I changed them to documented codes: `ENI_SG_RULES_MISMATCH` for security group mismatch and `SUBNET_ACL_RESTRICTION` for network ACL restriction.
- The JSON examples contained comments while using a `json` code fence. I changed those fences to `jsonc` so the examples are not presented as strict JSON.
- The Python automation sample used friendly names such as `nip-web-to-api` where the API expects Network Insights Path IDs. I replaced them with realistic `nip-...` placeholder IDs.
- The quotas section was outdated. I updated the default quotas to 1,000 paths, 10,000 analyses, and 100 concurrent analyses, and changed analysis retention from 30 days to 120 days.

## Review Notes
The AWS CLI, Boto3, and CloudFormation examples use current operation names and property names. The local environment did not have the AWS CLI installed, so command verification was performed against official AWS CLI documentation rather than local `--help` output.
