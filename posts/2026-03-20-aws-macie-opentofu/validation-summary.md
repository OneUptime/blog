# Validation Summary: How to Configure AWS Macie with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp AWS provider for Terraform/OpenTofu
- Amazon Macie
- Amazon S3
- Amazon EventBridge
- Amazon SNS
- AWS CLI

## Sources Consulted
- HashiCorp AWS provider docs for `aws_macie2_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/macie2_account.html.markdown
- HashiCorp AWS provider docs for `aws_macie2_classification_job`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/macie2_classification_job.html.markdown
- HashiCorp AWS provider docs for `aws_macie2_custom_data_identifier`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/macie2_custom_data_identifier.html.markdown
- HashiCorp AWS provider docs for `aws_caller_identity`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown
- HashiCorp AWS provider docs for `aws_cloudwatch_event_target`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_target.html.markdown
- Amazon Macie API Reference, Classification Job Creation: https://docs.aws.amazon.com/macie/latest/APIReference/jobs.html
- Amazon Macie User Guide, Amazon EventBridge event schema for Macie findings: https://docs.aws.amazon.com/macie/latest/user/findings-publish-event-schemas.html
- Amazon Macie User Guide, Severity scoring for Macie findings: https://docs.aws.amazon.com/macie/latest/user/findings-severity.html
- Amazon Macie User Guide, Creating and applying filters to Macie findings: https://docs.aws.amazon.com/macie/latest/user/findings-filter-procedure.html
- AWS CLI Command Reference, `aws macie2 list-findings`: https://docs.aws.amazon.com/cli/latest/reference/macie2/list-findings.html
- Amazon EventBridge User Guide, Using resource-based policies for Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html

## Issues Found
- The classification job examples referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. I added `data "aws_caller_identity" "current" {}` so the snippet is self-consistent.
- The classification job scoping example used `key = "PREFIX"`, which is not a valid Macie scope filter key. I changed it to `OBJECT_KEY`, which is the documented key for prefix-based object matching.
- The custom data identifier was created but never attached to either classification job, so it would not have been used during scans. I added `custom_data_identifier_ids = [aws_macie2_custom_data_identifier.account_number.id]` to both jobs.
- The EventBridge rule filtered on `Critical` severity, but Macie finding severities are `Low`, `Medium`, and `High`. I changed the rule and conclusion text to use `High` severity only.
- The deployment example used `aws macie2 list-findings --filter-criteria '{"severity":{"gte":7}}'`, which is not valid for the current AWS CLI or Macie filter model. I replaced it with a documented `--finding-criteria` example using `severity.description`.
- The SNS routing section implied the target would work without mentioning topic permissions. I added a note that the SNS topic policy must allow `events.amazonaws.com` to publish.

## Review Notes
- `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target` remain valid provider resources even though AWS now brands the service as EventBridge.
- The post still assumes variables such as `project_name`, `s3_bucket_names`, and `security_sns_topic_arn` are defined elsewhere in the OpenTofu configuration.
- The `list-findings` command returns finding IDs, not full finding documents; use `get-findings` separately if full details are needed.
