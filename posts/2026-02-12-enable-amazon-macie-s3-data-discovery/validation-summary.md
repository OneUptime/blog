# Validation Summary: How to Enable Amazon Macie for S3 Data Discovery

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Amazon Macie
- Amazon S3
- AWS CLI
- AWS Organizations
- Amazon EventBridge
- Terraform AWS Provider

## Sources Consulted
- Amazon Macie User Guide: What is Amazon Macie? https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html
- Amazon Macie User Guide: Discovering sensitive data with Macie https://docs.aws.amazon.com/macie/latest/user/data-classification.html
- Amazon Macie User Guide: Performing automated sensitive data discovery https://docs.aws.amazon.com/macie/latest/user/discovery-asdd.html
- Amazon Macie User Guide: Configuring automated sensitive data discovery settings https://docs.aws.amazon.com/macie/latest/user/discovery-asdd-account-configure.html
- Amazon Macie User Guide: Integrating and configuring an organization in Macie https://docs.aws.amazon.com/macie/latest/user/accounts-mgmt-ao-integrate.html
- Amazon Macie User Guide: Filtering findings and finding fields https://docs.aws.amazon.com/macie/latest/user/findings-filter-fields.html
- AWS CLI Command Reference for macie2 commands: enable-macie, get-macie-session, describe-buckets, create-classification-job, update-automated-discovery-configuration, list-findings, create-custom-data-identifier, create-member, update-organization-configuration, get-finding-statistics, get-usage-statistics
- AWS Macie Pricing https://aws.amazon.com/macie/pricing/
- Terraform AWS Provider documentation/source for aws_macie2_account and aws_macie2_classification_job https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_account and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_classification_job

## Issues Found
- The post described Macie bucket inventory and security posture monitoring as free. Updated this to state that it is included in the 30-day free trial and then billed per monitored S3 bucket.
- The `aws macie2 list-findings` example used `--max-results`, which is not a valid AWS CLI option for this paginated command. Changed it to `--max-items`.
- The Terraform example used `schedule_frequency_details`, but the `aws_macie2_classification_job` resource uses `schedule_frequency`. Updated the block name.
- The Terraform example used `aws_macie2_automated_discovery_configuration`, which is not present in the current official HashiCorp AWS provider resource documentation/source. Removed that unsupported resource block; the post still shows the valid AWS CLI command for automated discovery.
- The custom data identifier section said custom identifiers are automatically included in all subsequent discovery jobs. Updated it to explain that jobs must select custom identifier IDs, and automated discovery must include them through the sensitivity inspection template.
- The Macie pricing section listed outdated or incorrect rates and omitted bucket and object monitoring dimensions. Replaced it with current US East (N. Virginia) pricing dimensions from AWS: monitored buckets, automated discovery object monitoring, automated sensitive data discovery data inspection, and targeted discovery data inspection.
- The `aws macie2 get-usage-statistics` example used invalid `sort-by` field names. Changed it to sort by `key: "total"` with descending order.

## Review Notes
The AWS CLI and Terraform binaries were not installed locally, so command validation used the official AWS CLI reference and Terraform AWS provider documentation/source instead of local `--help` output. Pricing is region-sensitive; the corrected pricing text explicitly scopes the example rates to US East (N. Virginia) as of June 2026.
