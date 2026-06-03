# Validation Summary: How to Create Custom Security Hub Insights

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Security Hub CSPM
- AWS CLI
- Boto3 for Python
- Terraform AWS provider
- AWS Security Finding Format filters

## Sources Consulted
- AWS CLI Command Reference: create-insight - https://docs.aws.amazon.com/cli/latest/reference/securityhub/create-insight.html
- AWS CLI Command Reference: get-insight-results - https://docs.aws.amazon.com/cli/latest/reference/securityhub/get-insight-results.html
- AWS Security Hub CSPM API Reference: CreateInsight - https://docs.aws.amazon.com/securityhub/1.0/APIReference/API_CreateInsight.html
- AWS Security Hub CSPM API Reference: GetFindings - https://docs.aws.amazon.com/securityhub/1.0/APIReference/API_GetFindings.html
- HashiCorp Terraform AWS Provider: aws_securityhub_insight - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_insight

## Issues Found
- The Security Hub compliance-control examples filtered `ProductName` with `Security Hub`. Current AWS documentation identifies the product name for control-based findings as `Security Hub CSPM`, and product-name filters are case-sensitive exact string filters. Updated both the AWS CLI and Terraform examples to use `Security Hub CSPM`.
- The stale-findings example used `CreatedAt` with `DateRange` but no comparison, which defaults to `WITHIN` and therefore selects findings created within the last 30 days. Added `Comparison: "OLDER_THAN"` so the insight actually selects critical findings older than 30 days.
- The "List all custom insights" AWS CLI query matched every Security Hub insight ARN in the partition, including default insights. Updated the JMESPath query to match ARNs containing `/custom/`.
- The stale-findings explanation said to group by creation date, but the command groups by account ID. Updated the sentence to say it filters by creation date and shows which accounts have old findings piling up.

## Review Notes
- AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI and Security Hub API documentation instead of local `--help` output.
- The Boto3 report snippet uses the documented `get_insights` and `get_insight_results` response structure. In a production script, pagination for `get_insights` may be needed if an account has enough insights to span multiple pages.
