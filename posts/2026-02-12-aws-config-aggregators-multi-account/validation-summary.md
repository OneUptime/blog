# Validation Summary: How to Use AWS Config Aggregators for Multi-Account Visibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Config configuration aggregators
- AWS Organizations trusted access and delegated administrators
- AWS CLI
- Terraform AWS provider
- Python boto3
- AWS Config advanced queries

## Sources Consulted
- AWS Config Developer Guide: Creating Aggregators for AWS Config - https://docs.aws.amazon.com/config/latest/developerguide/aggregated-create.html
- AWS Config Developer Guide: Registering a Delegated Administrator for AWS Config - https://docs.aws.amazon.com/config/latest/developerguide/aggregated-register-delegated-administrator.html
- AWS Config Developer Guide: Authorizing Aggregator Accounts - https://docs.aws.amazon.com/config/latest/developerguide/aggregated-add-authorization.html
- AWS CLI Command Reference: put-configuration-aggregator - https://docs.aws.amazon.com/cli/latest/reference/configservice/put-configuration-aggregator.html
- AWS CLI Command Reference: describe-aggregate-compliance-by-config-rules - https://docs.aws.amazon.com/cli/latest/reference/configservice/describe-aggregate-compliance-by-config-rules.html
- AWS CLI Command Reference: get-aggregate-compliance-details-by-config-rule - https://docs.aws.amazon.com/cli/latest/reference/configservice/get-aggregate-compliance-details-by-config-rule.html
- AWS CLI Command Reference: get-aggregate-discovered-resource-counts - https://docs.aws.amazon.com/cli/latest/reference/configservice/get-aggregate-discovered-resource-counts.html
- AWS Config Developer Guide: Querying the Current Configuration State of AWS Resources - https://docs.aws.amazon.com/config/latest/developerguide/querying-AWS-resources.html
- AWS Config API Reference: SelectAggregateResourceConfig - https://docs.aws.amazon.com/config/latest/APIReference/API_SelectAggregateResourceConfig.html
- Terraform AWS Provider: aws_config_configuration_aggregator - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_aggregator
- boto3/botocore ConfigService: describe_aggregate_compliance_by_config_rules - https://docs.aws.amazon.com/botocore/latest/reference/services/config/client/describe_aggregate_compliance_by_config_rules.html

## Issues Found
- The organization aggregator CLI examples used the AWS Config service-linked role ARN as `RoleArn`. AWS documentation requires an IAM role trusted by `config.amazonaws.com` with AWS Organizations read permissions, commonly via `AWSConfigRoleForOrganizations`. Added role creation and policy attachment commands, and updated the aggregator `RoleArn` examples to use that role.
- The compliance summary CLI example used `get-aggregate-compliance-details-by-config-rule` without the required `--account-id` and `--aws-region` arguments. Replaced it with `describe-aggregate-compliance-by-config-rules`, which is the correct aggregate summary API for filtering non-compliant rule results across accounts and regions.
- The discovered-resource-counts example was described as finding non-compliant security groups, but the API only returns resource counts. Updated the heading and comment to describe resource counts accurately.
- The S3 advanced query used `IS NULL`, but AWS Config advanced queries do not support SQL NULL value queries. Replaced it with a supported S3 bucket versioning query using an explicit `Suspended` value.
- The Terraform example could create the configuration aggregator before the IAM role policy attachment, because the aggregator only had an implicit dependency on the role ARN. Added an explicit `depends_on` for the policy attachment.
- The Python boto3 example only read the first page of aggregate compliance results. Updated it to use a paginator.
- Clarified that `put-aggregation-authorization --authorized-aws-region` refers to the Region where the aggregator was created.

## Review Notes
AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI and AWS Config documentation rather than local `--help` output.
