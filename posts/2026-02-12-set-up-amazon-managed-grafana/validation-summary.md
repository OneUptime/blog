# Validation Summary: How to Set Up Amazon Managed Grafana

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon Managed Grafana
- AWS CLI
- AWS IAM Identity Center
- AWS Identity Store
- AWS IAM roles and policies
- Amazon CloudWatch
- AWS X-Ray
- Amazon Managed Service for Prometheus
- Amazon SNS
- Grafana HTTP API

## Sources Consulted
- Amazon Managed Grafana `CreateWorkspace` API: https://docs.aws.amazon.com/grafana/latest/APIReference/API_CreateWorkspace.html
- AWS CLI `grafana create-workspace`: https://docs.aws.amazon.com/cli/latest/reference/grafana/create-workspace.html
- AWS CLI `grafana update-permissions`: https://docs.aws.amazon.com/cli/latest/reference/grafana/update-permissions.html
- AWS CLI `grafana create-workspace-service-account`: https://docs.aws.amazon.com/cli/latest/reference/grafana/create-workspace-service-account.html
- AWS CLI `grafana create-workspace-service-account-token`: https://docs.aws.amazon.com/cli/latest/reference/grafana/create-workspace-service-account-token.html
- Amazon Managed Grafana service accounts: https://docs.aws.amazon.com/grafana/latest/userguide/v10-service-accounts.html
- Amazon Managed Grafana permissions and policies for AWS data sources: https://docs.aws.amazon.com/grafana/latest/userguide/AMG-manage-permissions.html
- Amazon Managed Grafana workspace configuration: https://docs.aws.amazon.com/grafana/latest/userguide/AMG-configure-workspace.html
- Amazon Managed Grafana plugin management: https://docs.aws.amazon.com/grafana/latest/userguide/grafana-plugins.html
- Amazon Managed Grafana authentication: https://docs.aws.amazon.com/grafana/latest/userguide/authentication-in-AMG.html
- IAM Identity Center AWS managed applications support table: https://docs.aws.amazon.com/singlesignon/latest/userguide/awsapps-that-work-with-identity-center.html
- Grafana data source HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/data_source/

## Issues Found
- The AWS CLI `create-workspace` example used `--permission-type SERVICE_MANAGED`. AWS documentation states that CLI/API/CloudFormation workspace creation should use `CUSTOMER_MANAGED`; service-managed role creation is supported through the Amazon Managed Grafana console. Updated the command and explanatory text.
- The CLI example used `--workspace-data-sources`, which AWS CLI documentation marks as internal-only. Removed it and replaced the surrounding explanation with `--workspace-role-arn` and `--workspace-notification-destinations SNS`.
- Step 1 referenced an IAM role before Step 2 created it. Added a short comment that the CLI example assumes the role has already been created.
- The IAM policy omitted CloudWatch discovery permissions that AWS includes in the managed CloudWatch policy examples. Added `ec2:DescribeTags`, `ec2:DescribeInstances`, `ec2:DescribeRegions`, and `tag:GetResources`.
- The alerting section created an SNS topic but the customer-managed role did not allow publishing to SNS. Added `sns:Publish` for `grafana*` SNS topics, matching AWS's documented service-managed SNS policy pattern.
- The Grafana HTTP API example used `create-workspace-api-key`. AWS documents API keys as deprecated and removed in Amazon Managed Grafana version 12. Replaced the example with service account and service account token commands.
- The alerting UI referred to "notification channel", which is legacy terminology for older Grafana alerting. Updated it to "contact point" while preserving the rest of the alerting workflow.
- The CloudWatch data source navigation used older Grafana UI terminology only. Updated it to the current Connections path while preserving the older Configuration path as a compatibility note.

## Review Notes
The post remains a high-level setup guide and does not cover every production hardening detail. Future improvements could include a dedicated IAM policy file per data source, least-privilege SNS topic ARNs for the reader's account and Region, and version-specific screenshots for Grafana 10, 11, and 12. The local environment did not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI documentation.
