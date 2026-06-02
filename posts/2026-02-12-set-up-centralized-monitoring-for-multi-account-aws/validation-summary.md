# Validation Summary: How to Set Up Centralized Monitoring for Multi-Account AWS

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS CloudWatch cross-account observability
- CloudWatch Observability Access Manager (OAM)
- AWS Organizations
- AWS CLI v2
- AWS CloudFormation StackSets
- CloudWatch Logs Insights
- CloudWatch alarms and dashboards
- AWS CloudTrail organization trails
- Amazon SNS
- AWS IAM

## Sources Consulted
- AWS CLI Command Reference: `oam create-link` - https://docs.aws.amazon.com/cli/latest/reference/oam/create-link.html
- AWS OAM API Reference: `PutSinkPolicy` - https://docs.aws.amazon.com/OAM/latest/APIReference/API_PutSinkPolicy.html
- AWS CloudFormation Template Reference: `AWS::Oam::Link` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-oam-link.html
- Amazon CloudWatch User Guide: CloudWatch cross-account observability - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html
- Amazon CloudWatch User Guide: Link monitoring accounts with source accounts - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account-Setup.html
- AWS CLI Command Reference: `logs start-query` - https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html
- Amazon CloudWatch Logs User Guide: Logs Insights `SOURCE` command - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Source.html
- AWS CLI Command Reference: `cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch User Guide: CloudWatch dashboards and cross-account dashboard syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html
- AWS Service Authorization Reference: Amazon CloudWatch condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatch.html
- AWS CLI Command Reference: `cloudformation create-stack-instances` - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack-instances.html

## Issues Found
- The OAM sink policy used `ForAnyValue:StringEquals` with `aws:PrincipalOrgID`. Changed it to `StringEquals`, matching AWS's organization-wide sink policy examples for a single-valued organization ID condition.
- The CloudWatch Logs Insights CLI example used `--log-group-names` and claimed it would automatically search matching log groups across all linked accounts. Updated it to use the Logs Insights `SOURCE logGroups(...)` command, which AWS documents as the CLI/API way to select log groups across linked accounts.
- The cross-account alarm example used a non-existent top-level `--account-id` option for `put-metric-alarm`. Rewrote the command to use `--metrics` with `AccountId` inside the metric data query, which is the documented cross-account alarm syntax.
- The dashboard JSON block contained a `//` comment, making it invalid JSON. Removed the comment so the dashboard body is syntactically valid JSON.
- The IAM access-control example used `cloudwatch:requestedAccountId`, which is not a documented CloudWatch condition key. Replaced it with a valid read-only CloudWatch/OAM policy and added a note that per-source-account visibility boundaries should be handled through separate monitoring accounts or dashboard access.

## Review Notes
The post remains a high-level setup guide. Real deployments still need environment-specific details such as existing S3 bucket policy configuration for CloudTrail organization trails, selected AWS Regions, and exact AWS Organizations root or OU IDs for StackSets.
