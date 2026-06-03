# Validation Summary: How to Configure Macie Automated Sensitive Data Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Macie
- Amazon S3
- AWS CLI
- AWS Organizations
- Amazon EventBridge
- AWS Security Hub
- Terraform

## Sources Consulted
- AWS CLI Command Reference: update-automated-discovery-configuration - https://docs.aws.amazon.com/cli/latest/reference/macie2/update-automated-discovery-configuration.html
- AWS CLI Command Reference: update-classification-scope - https://docs.aws.amazon.com/cli/latest/reference/macie2/update-classification-scope.html
- AWS CLI Command Reference: update-resource-profile - https://docs.aws.amazon.com/cli/latest/reference/macie2/update-resource-profile.html
- AWS CLI Command Reference: update-sensitivity-inspection-template - https://docs.aws.amazon.com/cli/latest/reference/macie2/update-sensitivity-inspection-template.html
- AWS CLI Command Reference: batch-update-automated-discovery-accounts - https://docs.aws.amazon.com/cli/latest/reference/macie2/batch-update-automated-discovery-accounts.html
- AWS CLI Command Reference: describe-buckets - https://docs.aws.amazon.com/cli/latest/reference/macie2/describe-buckets.html
- AWS CLI Command Reference: get-usage-totals - https://docs.aws.amazon.com/cli/latest/reference/macie2/get-usage-totals.html
- AWS CLI Command Reference: get-usage-statistics - https://docs.aws.amazon.com/cli/latest/reference/macie2/get-usage-statistics.html
- AWS CLI Command Reference: put-findings-publication-configuration - https://docs.aws.amazon.com/cli/latest/reference/macie2/put-findings-publication-configuration.html
- Amazon Macie User Guide: Performing automated sensitive data discovery - https://docs.aws.amazon.com/macie/latest/user/discovery-asdd.html
- Amazon Macie User Guide: How automated sensitive data discovery works - https://docs.aws.amazon.com/macie/latest/user/discovery-asdd-how-it-works.html
- Amazon Macie User Guide: Configuring settings for automated sensitive data discovery - https://docs.aws.amazon.com/macie/latest/user/discovery-asdd-account-configure.html
- Amazon Macie User Guide: Sensitivity scoring for S3 buckets - https://docs.aws.amazon.com/macie/latest/user/discovery-scoring-s3.html
- Amazon Macie User Guide: Quick reference for managed data identifiers - https://docs.aws.amazon.com/macie/latest/user/mdis-reference-quick.html
- Amazon Macie pricing - https://aws.amazon.com/macie/pricing/
- HashiCorp AWS Provider documentation source for Macie resources - https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/r

## Issues Found
- The Terraform example used `aws_macie2_automated_discovery_configuration`, which is not a current HashiCorp AWS provider resource. Replaced it with a `terraform_data` local-exec example that calls the supported AWS CLI command after enabling Macie.
- The bucket exclusion examples used `update-resource-profile --sensitivity-score-override -1`. That command only supports assigning the maximum score of 100 or clearing the override; automated discovery bucket exclusion is managed through the classification scope. Replaced those examples with `get-automated-discovery-configuration` and `update-classification-scope`.
- The bucket profile commands were described as listing included buckets and scores, but `list-resource-profile-artifacts` and `list-resource-profile-detections` retrieve selected objects and sensitive-data detections for a specific bucket. Replaced the examples with `get-classification-scope`, `describe-buckets`, and `get-resource-profile`.
- Several managed data identifier IDs were invalid for Macie, including `US_SOCIAL_SECURITY_NUMBER`, `AWS_SECRET_ACCESS_KEY`, and `US_PASSPORT_NUMBER`. Updated them to valid IDs such as `USA_SOCIAL_SECURITY_NUMBER`, `AWS_CREDENTIALS`, and `USA_PASSPORT_NUMBER`.
- The cost section said automated discovery charges per object evaluated. Updated it to distinguish automated object monitoring from object analysis based on uncompressed data inspected.
- The usage-statistics filter used `serviceLimit` with a metric name, which is not a valid filter. Replaced it with JMESPath queries against the returned usage metric types.
- The sensitivity-score explanation originally treated `-1` as an exclusion marker. Updated it to reflect Macie's scoring model, where `-1` means classification error, `50` means not yet analyzed, and `100` is manually assigned.
- The EventBridge Terraform example used `detail-type` as an unquoted HCL object key. Quoted it as `"detail-type"` so the HCL parses correctly.

## Review Notes
The AWS provider still supports Macie resources such as `aws_macie2_account` and `aws_macie2_organization_configuration`, but automated sensitive data discovery configuration currently requires using the AWS API or CLI directly. The EventBridge and Security Hub examples use current event and publication configuration fields.
