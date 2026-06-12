# Validation Summary: How to Create Budget Alerts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Budgets
- AWS CLI
- AWS SNS
- AWS Lambda
- Terraform AWS provider
- Google Cloud Billing Budgets
- gcloud CLI
- Terraform Google provider
- Google Cloud Pub/Sub
- Google Cloud Functions
- Google Compute Engine
- Slack incoming webhooks
- PagerDuty Events API v2
- Python

## Sources Consulted
- AWS Budgets user guide: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
- AWS CLI `budgets create-budget`: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS Budgets `CreateBudget` API reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_CreateBudget.html
- AWS SNS topics for budget notifications: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- Terraform AWS provider `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Google Cloud budget alerts guide: https://cloud.google.com/billing/docs/how-to/budgets
- Google Cloud programmatic budget notifications: https://cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications
- gcloud `billing budgets create`: https://cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Terraform Google provider `google_billing_budget`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/billing_budget
- Slack incoming webhook docs: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- PagerDuty Events API v2 docs: https://developer.pagerduty.com/docs/events-api-v2-overview

## Issues Found
- The post described budget alerts as real-time anomaly detection. AWS Budgets and Google Cloud Billing budget notifications both have billing-data delays, so this was changed to "detect cost spikes early, subject to cloud billing data delays."
- The AWS Terraform SNS example created an SNS topic but did not grant AWS Budgets permission to publish to it. Added an `aws_sns_topic_policy` with the documented `budgets.amazonaws.com` publish permission and a `depends_on` from the budget resource.
- The optional AWS Lambda SNS subscription lacked Lambda invoke permission for SNS. Added `aws_lambda_permission` for the SNS topic.
- The Google Terraform budget filter used a project ID where the provider expects `projects/{project_number}`. Changed the example to `projects/123456789012`.
- The Google service-filter comment labeled `services/24E6-581D-38E5` as Compute Engine, but that ID is BigQuery. Updated the comment.
- The AWS Lambda sample parsed the AWS Budgets SNS message as JSON fields that AWS Budgets does not publish in that form. Updated the sample to parse the plain text budget notification fields before routing alerts.
- The AWS Slack webhook sample attempted to override `channel`, `username`, and icon through an incoming webhook payload. Slack incoming webhooks use the webhook's configured channel and app identity, so those fields and channel-specific calls were removed and a top-level `text` fallback was added.

## Review Notes
The post is technically relevant and now validates as an implementation guide. The examples still use placeholder resource IDs, account IDs, email addresses, and undeclared optional resources such as `aws_lambda_function.budget_handler` and `google_cloudfunctions_function.budget_handler`, which is appropriate for illustrative snippets but should be replaced in a production module.
