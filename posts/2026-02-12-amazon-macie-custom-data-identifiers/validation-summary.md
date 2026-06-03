# Validation Summary: How to Use Amazon Macie Custom Data Identifiers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Macie
- Amazon S3
- AWS CLI
- Amazon EventBridge
- AWS Lambda with Python and boto3
- Terraform AWS Provider

## Sources Consulted
- Amazon Macie User Guide: Building custom data identifiers - https://docs.aws.amazon.com/macie/latest/user/custom-data-identifiers.html
- Amazon Macie User Guide: Configuration options for custom data identifiers - https://docs.aws.amazon.com/macie/latest/user/cdis-options.html
- Amazon Macie API Reference: Custom Data Identifier Creation - https://docs.aws.amazon.com/macie/latest/APIReference/custom-data-identifiers.html
- AWS CLI Command Reference: macie2 create-custom-data-identifier - https://docs.aws.amazon.com/cli/latest/reference/macie2/create-custom-data-identifier.html
- AWS CLI Command Reference: macie2 test-custom-data-identifier - https://docs.aws.amazon.com/cli/latest/reference/macie2/test-custom-data-identifier.html
- AWS CLI Command Reference: macie2 create-classification-job - https://docs.aws.amazon.com/cli/latest/reference/macie2/create-classification-job.html
- AWS CLI Command Reference: macie2 list-custom-data-identifiers - https://docs.aws.amazon.com/cli/latest/reference/macie2/list-custom-data-identifiers.html
- AWS CLI Command Reference: macie2 list-findings - https://docs.aws.amazon.com/cli/latest/reference/macie2/list-findings.html
- Amazon Macie User Guide: EventBridge event schema for Macie findings - https://docs.aws.amazon.com/macie/latest/user/findings-publish-event-schemas.html
- Amazon Macie User Guide: Fields for filtering Macie findings - https://docs.aws.amazon.com/macie/latest/user/findings-filter-fields.html
- Amazon EventBridge User Guide: Event pattern syntax and comparison operators - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html and https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Terraform AWS Provider: aws_macie2_custom_data_identifier - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_custom_data_identifier
- Terraform AWS Provider: aws_macie2_classification_job - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_classification_job

## Issues Found
- The custom data identifier keyword explanation said keywords only had to appear near a regex match. Updated it to say Macie keywords must precede the match and be within the configured maximum match distance.
- The AWS CLI `--tags` example used EC2-style tag shorthand. Updated it to Macie's map shorthand, `--tags Team=Security`.
- Several severity examples used `CRITICAL`, but Macie custom data identifier severities are only `LOW`, `MEDIUM`, and `HIGH`. Updated those examples and the related Lambda comment.
- The `test-custom-data-identifier` explanation said the response includes match locations. Updated it because the AWS CLI output returns `matchCount`.
- The `list-custom-data-identifiers` JMESPath query used incorrect output casing. Updated it to query `items[].{Name:name,Id:id,CreatedAt:createdAt}`.
- The classification job CLI example used the invalid option `--schedule-frequency-details` and PascalCase JSON members. Updated it to `--schedule-frequency` with the lower camelCase structure used by the AWS CLI/API.
- The Terraform example used `schedule_frequency_details`, but the current HashiCorp AWS provider resource uses `schedule_frequency`. Updated the block name.
- The EventBridge pattern used `anything-but` with an empty array to detect custom identifier findings. Updated it to use the documented EventBridge `exists` operator on the detection name leaf field.
- The `list-findings` example used a non-working empty-array `neq` filter for custom detections. Updated it to filter findings where the custom identifier detection count is greater than zero.

## Review Notes
- The local environment did not have the `aws` or `terraform` CLIs installed, so commands were verified against official documentation rather than local command help or provider validation.
