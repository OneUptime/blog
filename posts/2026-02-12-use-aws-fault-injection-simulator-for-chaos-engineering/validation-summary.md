# Validation Summary: How to Use AWS Fault Injection Simulator for Chaos Engineering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Fault Injection Service (AWS FIS)
- AWS CLI
- AWS IAM
- Amazon CloudWatch alarms
- Amazon EC2 and Auto Scaling groups
- AWS Systems Manager SSM documents
- Amazon RDS / Aurora failover

## Sources Consulted
- AWS FIS Actions reference: https://docs.aws.amazon.com/fis/latest/userguide/fis-actions-reference.html
- AWS FIS Systems Manager SSM documents: https://docs.aws.amazon.com/fis/latest/userguide/actions-ssm-agent.html
- AWS FIS Targets documentation: https://docs.aws.amazon.com/fis/latest/userguide/targets.html
- AWS CLI create-experiment-template reference: https://docs.aws.amazon.com/cli/latest/reference/fis/create-experiment-template.html
- AWS CLI start-experiment reference: https://docs.aws.amazon.com/cli/latest/reference/fis/start-experiment.html
- AWS CLI FIS examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_fis_code_examples.html
- AWS CLI CloudWatch put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The introduction said FIS can throttle API calls without qualification. AWS FIS API throttling fault actions are limited to supported services and operations, so I changed this to "throttling supported API calls."
- The IAM policy example omitted `rds:DescribeDBClusters` and `tag:GetResources`, which AWS lists for `aws:rds:failover-db-cluster` and target resolution. I added both permissions.
- The SSM-based network latency and CPU stress examples did not mention that targets must be SSM-managed EC2 instances. I added a prerequisite note about SSM Agent and the instance profile needed for Systems Manager commands.
- The first CloudWatch alarm description said "error rate exceeds 10%" while the metric was `HTTPCode_Target_5XX_Count` with a `Sum` threshold of 100. I changed the description to a target 5XX count threshold.
- The EC2 stop experiment targeted Auto Scaling group instances but did not account for ASG replacement of stopped instances. I added `completeIfInstancesTerminated` and updated the explanation to match the AWS FIS action behavior.

## Review Notes
The examples use placeholder ARNs, account IDs, load balancer dimensions, and template IDs that must be replaced before running. The AWS CLI binary was not installed in the local environment, so CLI validation was performed against official AWS CLI and AWS FIS documentation rather than local `aws help` output.
