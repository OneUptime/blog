# Validation Summary: How to Track Infrastructure Costs Across Environments with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- AWS provider default tags
- AWS Billing and Cost Management cost allocation tags
- AWS Cost Explorer
- AWS Cost Anomaly Detection
- Infracost CLI and GitHub Actions integration
- GitHub Actions workflow permissions

## Sources Consulted
- OpenTofu output values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu `formatdate` function documentation: https://opentofu.org/docs/language/functions/formatdate/
- AWS provider documentation for provider `default_tags`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- AWS provider documentation for `aws_ce_anomaly_monitor`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_monitor.html.markdown
- AWS provider documentation for `aws_ce_anomaly_subscription`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_subscription.html.markdown
- AWS Billing documentation on activating user-defined cost allocation tags: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- AWS Billing documentation on cost allocation tags and Cost Explorer filtering: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- AWS Cost Anomaly Detection user guide: https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html
- AWS Cost Management API reference for `AnomalyMonitor`: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_AnomalyMonitor.html
- AWS Cost Management API reference for `AnomalySubscription`: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_AnomalySubscription.html
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost GitHub Actions documentation: https://github.com/infracost/actions
- GitHub Actions workflow permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `actions/checkout` documentation: https://github.com/actions/checkout

## Issues Found

1. **Incorrect Cost Explorer activation path**: The post referred to activating tags in "AWS Cost Explorer > Cost Allocation Tags." AWS documents activation under AWS Billing and Cost Management > Cost allocation tags. Updated the output note and best-practice bullet accordingly.

2. **Incomplete cost allocation tag delay wording**: The post stated a single 24-hour activation delay. AWS documents up to 24 hours for new tag keys to appear for activation and then up to 24 hours for activation. Updated the best-practice bullet to reflect both delays.

3. **Outdated Infracost setup action**: The workflow used `infracost/actions/setup@v2`; current Infracost documentation uses `infracost/actions/setup@v3`. Updated the action version.

4. **GitHub Actions permissions omitted repository contents access**: The job set only `pull-requests: write`. GitHub sets unspecified permissions to `none`, and `actions/checkout` recommends `contents: read`. Added `contents: read`.

5. **Incorrect Infracost diff/comment flow**: The workflow generated separate base and PR `breakdown` files, then passed a text diff file to `infracost comment github`. Infracost documentation shows generating a base JSON with `breakdown`, generating the PR diff with `infracost diff --format json --compare-to`, and passing that JSON file to `infracost comment github`. Updated the workflow to follow that flow.

6. **Anomaly monitor did not filter by environment**: The Cost Anomaly Detection example named the monitor per environment but used a `DIMENSIONAL` `SERVICE` monitor, which tracks service-level spend rather than an `Environment` tag value. Changed it to a `CUSTOM` monitor with a tag-based `monitor_specification` for `Environment = var.environment`.

7. **SNS alert used an incompatible frequency**: The anomaly subscription used `frequency = "DAILY"` with an SNS subscriber. AWS documents SNS notifications for `IMMEDIATE` alerts, while `DAILY` and `WEEKLY` notifications are email-based. Changed the subscription frequency to `IMMEDIATE`.

## Review Notes
- The OpenTofu `output` examples are syntactically valid, but `timestamp()` changes on each apply, so it is better suited for ad hoc reporting metadata than a stable module output.
- The SNS anomaly alert snippet assumes the referenced SNS topic and its publish permissions for AWS Cost Anomaly Detection are configured elsewhere.
