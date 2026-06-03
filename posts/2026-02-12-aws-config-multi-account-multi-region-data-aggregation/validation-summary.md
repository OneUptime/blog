# Validation Summary: How to Use AWS Config Multi-Account Multi-Region Data Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Config
- AWS Config aggregators
- AWS Organizations
- AWS CLI
- Terraform AWS Provider
- Python boto3
- CloudWatch monitoring

## Sources Consulted
- AWS Config Developer Guide: Multi-Account Multi-Region Data Aggregation for AWS Config: https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html
- AWS Config Developer Guide: Creating Aggregators: https://docs.aws.amazon.com/config/latest/developerguide/aggregated-create.html
- AWS Organizations User Guide: AWS Config and AWS Organizations: https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-config.html
- AWS CLI Command Reference: put-configuration-aggregator: https://docs.aws.amazon.com/cli/latest/reference/configservice/put-configuration-aggregator.html
- AWS CLI Command Reference: put-configuration-recorder: https://docs.aws.amazon.com/cli/latest/reference/configservice/put-configuration-recorder.html
- AWS CLI Command Reference: put-aggregation-authorization: https://docs.aws.amazon.com/cli/latest/reference/configservice/put-aggregation-authorization.html
- AWS CLI Command Reference: get-aggregate-config-rule-compliance-summary: https://docs.aws.amazon.com/cli/latest/reference/configservice/get-aggregate-config-rule-compliance-summary.html
- AWS CLI Command Reference: get-aggregate-compliance-details-by-config-rule: https://docs.aws.amazon.com/cli/latest/reference/configservice/get-aggregate-compliance-details-by-config-rule.html
- AWS CLI Command Reference: get-aggregate-discovered-resource-counts: https://docs.aws.amazon.com/cli/latest/reference/configservice/get-aggregate-discovered-resource-counts.html
- AWS CLI Command Reference: describe-configuration-aggregator-sources-status: https://docs.aws.amazon.com/cli/latest/reference/configservice/describe-configuration-aggregator-sources-status.html
- AWS Config Developer Guide: Query Components for AWS Config: https://docs.aws.amazon.com/config/latest/developerguide/query-components.html
- AWS Config Developer Guide: Natural language query processor examples for advanced queries: https://docs.aws.amazon.com/config/latest/developerguide/query-assistant.html
- Boto3 documentation: get_aggregate_config_rule_compliance_summary: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/config/client/get_aggregate_config_rule_compliance_summary.html
- Terraform Registry: aws_config_configuration_aggregator: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_aggregator.html
- AWS Config managed rule: s3-bucket-server-side-encryption-enabled: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html
- AWS Config managed rule: required-tags: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html

## Issues Found
- The organization aggregator setup used the AWS Config service-linked role ARN as the organization aggregation source role. AWS documentation requires an IAM role that AWS Config can assume to retrieve AWS Organizations details, with the AWSConfigRoleForOrganizations managed policy. Updated the step to create that role and changed the example RoleArn values.
- The trusted-access command only enabled config-multiaccountsetup.amazonaws.com. For AWS Config aggregators, AWS Organizations documentation uses config.amazonaws.com; config-multiaccountsetup.amazonaws.com applies to AWS Config organization rule and conformance pack setup. Added config.amazonaws.com while keeping config-multiaccountsetup.amazonaws.com for the later organization rule workflow.
- The first aggregated compliance CLI example used get-aggregate-compliance-details-by-config-rule without the required account-id and aws-region arguments and described it as an account-wide summary. Replaced it with get-aggregate-config-rule-compliance-summary grouped by ACCOUNT_ID.
- The "Find all non-compliant resources" example used get-aggregate-discovered-resource-counts, which returns resource counts grouped by resource type, account, or region and does not filter compliance. Replaced it with select-aggregate-resource-config against AWS::Config::ResourceCompliance where configuration.complianceType is NON_COMPLIANT.
- The later get-aggregate-compliance-details-by-config-rule example omitted required account-id and aws-region arguments. Added both fields and clarified that the command returns results for one source account and region.
- The Python boto3 example iterated response['GroupByKeyCompliantSummary'], which is not in the documented response. Updated it to response['AggregateComplianceCounts'].

## Review Notes
- The Config recorder example assumes the referenced S3 bucket exists and has permissions that allow AWS Config delivery. That is normal for a compact setup example, but a production guide should include bucket policy details.
- AWS Config advanced query supports only a subset of SQL SELECT syntax. The post's "SQL-like" wording is accurate, but a future expansion could mention query limitations.
