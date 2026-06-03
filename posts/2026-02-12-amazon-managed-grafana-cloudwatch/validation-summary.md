# Validation Summary: How to Use Amazon Managed Grafana with CloudWatch Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Managed Grafana
- Amazon CloudWatch metrics
- Amazon CloudWatch Logs Insights
- AWS X-Ray
- AWS CLI
- IAM roles and managed policies
- Terraform AWS provider
- Grafana dashboards, template variables, and alerting

## Sources Consulted
- AWS CLI Command Reference: `create-workspace` - https://docs.aws.amazon.com/cli/latest/reference/grafana/create-workspace.html
- AWS CLI Command Reference: `update-workspace-authentication` - https://docs.aws.amazon.com/cli/latest/reference/grafana/update-workspace-authentication.html
- AWS CLI Command Reference: `update-permissions` - https://docs.aws.amazon.com/cli/latest/reference/grafana/update-permissions.html
- Amazon Managed Grafana API Reference: `CreateWorkspace` - https://docs.aws.amazon.com/grafana/latest/APIReference/API_CreateWorkspace.html
- Amazon Managed Grafana permissions and policies for AWS data sources - https://docs.aws.amazon.com/grafana/latest/userguide/AMG-manage-permissions.html
- Amazon Managed Grafana CloudWatch data source setup - https://docs.aws.amazon.com/grafana/latest/userguide/adding-CloudWatch-AWS-config.html
- AWS managed policy reference: `AmazonGrafanaCloudWatchAccess` - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonGrafanaCloudWatchAccess.html
- Grafana CloudWatch query editor documentation - https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/query-editor/
- Grafana CloudWatch template variables documentation - https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/template-variables/
- Amazon Managed Grafana X-Ray data source documentation - https://docs.aws.amazon.com/grafana/latest/userguide/xray-using.html
- AWS X-Ray filter expression documentation - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html
- CloudWatch Logs Insights query syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Terraform AWS provider docs for `aws_grafana_workspace` and `aws_grafana_role_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/grafana_workspace and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/grafana_role_association
- Linked OneUptime CloudWatch dashboards guide - https://oneuptime.com/blog/post/2026-02-12-cloudwatch-dashboards-terraform/view

## Issues Found
- The AWS CLI workspace creation example used `SERVICE_MANAGED`, `--workspace-data-sources`, and `--workspace-notification-destinations`. AWS documentation states CLI/API workspace creation should use `CUSTOMER_MANAGED` with `--workspace-role-arn`, and `workspace-data-sources` is for internal/service-managed console behavior. Updated the command and explanatory text.
- The IAM Identity Center section used `update-workspace-authentication` as if it associated SSO users. That command configures authentication providers/SAML settings. Replaced it with `update-permissions`, which is the AWS CLI command for assigning Grafana roles to SSO users or groups.
- The CloudWatch data source section implied service-managed roles are always created automatically. Clarified that this applies to console-created service-managed workspaces, while CLI/API customer-managed workspaces need a managed role.
- The cross-account IAM trust policy snippet contained a JavaScript-style comment inside a JSON code block, making it invalid JSON. Moved the comment into prose and updated the principal role name to match the earlier customer-managed workspace role example.
- The CloudWatch Logs Insights examples used SQL `--` comments. CloudWatch Logs Insights QL uses `#` for comments, so the examples were updated.
- The X-Ray query type list included `Trace Map`, but current Amazon Managed Grafana X-Ray docs list Trace List, Trace Statistics, Trace Analytics, and Insights. Updated the list accordingly.
- The Terraform example used `SERVICE_MANAGED` and `data_sources` while also creating a customer role. Updated it to `CUSTOMER_MANAGED`, removed the service-managed-only data source list, and attached the AWS managed policies for CloudWatch and X-Ray access.

## Review Notes
The dashboard JSON is a simplified Grafana snippet rather than a complete importable dashboard. It is structurally valid JSON, but a production dashboard export would normally include additional Grafana metadata such as schema version, dashboard UID, time range, and richer datasource references.
