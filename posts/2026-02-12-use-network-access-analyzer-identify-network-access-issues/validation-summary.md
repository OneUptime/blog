# Validation Summary: How to Use Network Access Analyzer to Identify Network Access Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Network Access Analyzer
- Amazon VPC
- AWS CLI for EC2 network insights access scopes
- Python boto3 EC2 client
- VPC networking controls including security groups, route tables, network ACLs, internet gateways, VPC peering, and load balancers

## Sources Consulted
- AWS Network Access Analyzer getting started documentation: https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started.html
- AWS Network Access Analyzer CLI getting started documentation: https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli.html
- AWS Network Access Analyzer match conditions documentation: https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/match-paths.html
- AWS Network Access Analyzer resource statements documentation: https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/resource-statement.html
- AWS Network Access Analyzer how it works and limitations documentation: https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/how-network-access-analyzer-works.html
- AWS CLI create-network-insights-access-scope reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-insights-access-scope.html
- AWS CLI start-network-insights-access-scope-analysis reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/start-network-insights-access-scope-analysis.html
- AWS CLI get-network-insights-access-scope-analysis-findings reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/get-network-insights-access-scope-analysis-findings.html
- boto3 EC2 get_network_insights_access_scope_analysis_findings reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/get_network_insights_access_scope_analysis_findings.html
- Amazon VPC pricing page, Network Access Analyzer pricing section: https://aws.amazon.com/vpc/pricing/
- AWS Security Blog on identifying publicly accessible resources with Network Access Analyzer: https://aws.amazon.com/blogs/security/identifying-publicly-accessible-resources-with-amazon-vpc-network-access-analyzer/

## Issues Found
- The console navigation said to use the VPC console. Current AWS getting-started documentation directs users to the Network Manager console for Network Access Analyzer, so the post was updated accordingly.
- The built-in scope list included an unsupported or undocumented `AWS-VPC-CrossVPC` entry and omitted current Amazon-created scopes. The list was updated to `All-IGW-Ingress`, `AWS-IGW-Egress`, `AWS-VPC-Ingress`, and `AWS-VPC-Egress` with documented descriptions.
- The custom scope description claimed the JSON identified private subnets and filtered by destination ports, but the snippet only matches internet gateway to ENI paths. The wording was corrected to match the actual scope definition.
- The analysis scope wording said it examines every VPC in the Region. AWS documents that Network Access Analyzer evaluates paths only within the account and Region where the analysis runs, so the wording was narrowed.
- The findings retrieval command used `--max-results`, which is the underlying API parameter name, not the AWS CLI paginator option. It was changed to `--max-items 50`.
- The pricing section claimed a monthly free allowance of 1,000 ENIs for the first analysis. The current Amazon VPC pricing page does not document that free tier and instead gives pricing at $0.002 per ENI analysis, so the paragraph was updated to match AWS's current pricing example.

## Review Notes
- The local environment does not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference rather than local `aws help` output.
- The Python boto3 example uses current EC2 client method names and response fields. In production, it should handle pagination when many findings are returned, but the single-call example is technically valid for a simple walkthrough.
