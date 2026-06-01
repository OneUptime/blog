# Validation Summary: How to Configure VPC Network Access Analyzer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC Network Access Analyzer
- AWS CLI
- AWS CloudFormation
- AWS Lambda with boto3
- Amazon EventBridge
- Amazon SNS
- AWS Security Hub

## Sources Consulted
- AWS CLI Command Reference: create-network-insights-access-scope - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-insights-access-scope.html
- AWS CLI Command Reference: start-network-insights-access-scope-analysis - https://docs.aws.amazon.com/cli/latest/reference/ec2/start-network-insights-access-scope-analysis.html
- AWS CLI Command Reference: describe-network-insights-access-scope-analyses - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-insights-access-scope-analyses.html
- AWS CLI Command Reference: get-network-insights-access-scope-analysis-findings - https://docs.aws.amazon.com/cli/latest/reference/ec2/get-network-insights-access-scope-analysis-findings.html
- Amazon VPC Network Access Analyzer: resource statements - https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/resource-statement.html
- Amazon VPC Network Access Analyzer: how it works - https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/how-network-access-analyzer-works.html
- Amazon VPC Network Access Analyzer: getting started with the AWS CLI - https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli.html
- AWS CloudFormation: AWS::EC2::NetworkInsightsAccessScope - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-networkinsightsaccessscope.html
- AWS CloudFormation: PathStatementRequest - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ec2-networkinsightsaccessscope-pathstatementrequest.html
- AWS CloudFormation: PacketHeaderStatementRequest - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ec2-networkinsightsaccessscope-packetheaderstatementrequest.html
- AWS Security Hub CLI: batch-import-findings - https://docs.aws.amazon.com/cli/latest/reference/securityhub/batch-import-findings.html
- Boto3 EC2 client: get_network_insights_access_scope_analysis_findings - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/get_network_insights_access_scope_analysis_findings.html

## Issues Found
- Corrected Network Access Scope examples to use `PacketHeaderStatement` instead of the invalid `PacketHeader` field.
- Corrected destination port syntax from `{From, To}` objects to string port values in Network Access Scope input and CloudFormation, matching the documented `PacketHeaderStatementRequest` shape.
- Replaced invalid CLI `--tags` usage with `--tag-specifications` for `create-network-insights-access-scope`.
- Replaced unsupported resource type selectors `AWS::RDS::DBInstance` and `AWS::EC2::Instance` with supported VPC resource IDs and adjusted the wording from RDS-instance-specific matching to database-port matching in a VPC.
- Replaced invalid example VPC IDs with plausible VPC ID formats.
- Corrected the sample findings output to use documented fields such as `DestinationPortRanges` and `SecurityGroupRule` instead of `DestinationPorts` and `SecurityGroupRuleIds`.
- Updated the boto3 Lambda example to paginate `get_network_insights_access_scope_analysis_findings` results with `NextToken`.
- Replaced the unsupported Security Hub product enablement command with guidance to import prepared ASFF findings via `batch-import-findings`.
- Softened claims that Network Access Analyzer identifies all possible paths, because AWS documents representative findings and several analysis limitations.

## Review Notes
The EventBridge scheduling examples use the classic `aws events` commands, which remain valid. A production implementation should also include Lambda permissions for EventBridge invocation and use a workflow such as Step Functions for long-running analyses that could exceed a Lambda timeout.
