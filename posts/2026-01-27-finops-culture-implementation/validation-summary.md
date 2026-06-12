# Validation Summary: How to Implement FinOps Culture in Your Organization

## Status
validated

## Post Type
Guide

## Technologies Covered
- FinOps Framework
- Cloud cost allocation and optimization
- AWS Cost and Usage Reports / AWS Data Exports
- Google Cloud Billing export to BigQuery
- AWS IAM / Service Control Policies
- AWS resource tagging
- Kubernetes labels and resource requests
- Slack Block Kit messages
- Python and YAML configuration examples

## Sources Consulted
- FinOps Foundation, "What is FinOps?" https://www.finops.org/introduction/what-is-finops/
- FinOps Foundation, "FinOps Phases" https://www.finops.org/framework/phases/
- AWS IAM documentation, "Conditions with multiple context keys or values" https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-logic-multiple-context-keys-or-values.html
- AWS IAM documentation, "IAM JSON policy elements: Condition operators" https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM documentation, "AWS global condition context keys" https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM documentation, "Controlling access to AWS resources using tags" https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html
- AWS Data Exports documentation, "AWS Data Exports" https://docs.aws.amazon.com/cur/latest/userguide/what-is-data-exports.html
- AWS Data Exports documentation, "What are AWS Cost and Usage Reports?" https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html
- Google Cloud documentation, "Export Cloud Billing data to BigQuery" https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery
- Kubernetes documentation, "Labels and Selectors" https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- AWS EC2 documentation, "Reserved Instances for Amazon EC2 overview" https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- AWS Savings Plans documentation, "Compute Savings Plans and Reserved Instances" https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html
- AWS EC2 documentation, "Spot Instances" https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html
- Slack Developer Docs, "Button element" https://docs.slack.dev/reference/block-kit/block-elements/button-element

## Issues Found
- The AWS Service Control Policy example attempted to require multiple request tags in one `Null` condition block. AWS IAM evaluates multiple context keys under the same condition operator with logical AND, so the original policy would deny only requests missing all listed tags, not requests missing any single required tag. I split the example into three separate deny statements, one for each required tag, so a missing `team`, `environment`, or `service` request tag triggers an explicit deny.

## Review Notes
- The Python snippets are illustrative examples and parse successfully as Python. The Slack example assumes a configured `slack_client`, which is appropriate for a focused snippet.
- All YAML snippets parse successfully and are presented as illustrative taxonomies, runbooks, and operating models rather than provider-specific schemas.
- The post's quoted savings ranges are broad illustrative estimates, not provider guarantees. They are acceptable as guidance, but future revisions could clarify that actual savings vary by workload and commitment strategy.
