# Validation Summary: How to Implement Landing Zone Best Practices on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Control Tower
- AWS Organizations
- AWS Control Tower controls and guardrails
- Terraform AWS provider
- AWS CloudFormation
- Amazon GuardDuty
- AWS Security Hub
- AWS Config
- Amazon VPC and Transit Gateway
- AWS Resource Access Manager
- Amazon Route 53 private hosted zones and Profiles
- Python boto3

## Sources Consulted
- AWS Control Tower landing zone schemas: https://docs.aws.amazon.com/controltower/latest/userguide/landing-zone-schemas.html
- AWS Control Tower control identifiers: https://docs.aws.amazon.com/controltower/latest/controlreference/control-identifiers.html
- AWS Control Tower control behavior and guidance: https://docs.aws.amazon.com/controltower/latest/controlreference/control-behavior.html
- AWS Prescriptive Guidance for deploying Control Tower controls with Terraform: https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-and-manage-aws-control-tower-controls-by-using-terraform.html
- AWS Control Tower RDS controls reference: https://docs.aws.amazon.com/controltower/latest/controlreference/rds-rules.html
- AWS Control Tower S3 controls reference: https://docs.aws.amazon.com/controltower/latest/controlreference/s3-rules.html
- AWS CloudFormation AWS::GuardDuty::Detector data source configuration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-guardduty-detector-cfndatasourceconfigurations.html
- AWS CloudFormation AWS::Config::ConfigurationRecorder RecordingGroup reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-config-configurationrecorder-recordinggroup.html
- Amazon EBS encryption by default documentation: https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- HashiCorp Terraform aws_ebs_encryption_by_default resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_encryption_by_default
- Terraform aws_route53_vpc_association_authorization resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_vpc_association_authorization
- Amazon Route 53 cross-account private hosted zone association guide: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs-different-accounts.html
- Amazon Route 53 Profiles sharing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/sharing-profiles.html
- AWS CLI Config get-aggregate-compliance-details-by-config-rule reference: https://docs.aws.amazon.com/cli/latest/reference/configservice/get-aggregate-compliance-details-by-config-rule.html
- boto3 Organizations list_accounts reference: https://docs.aws.amazon.com/boto3/latest/reference/services/organizations/client/list_accounts.html

## Issues Found
- The Terraform Control Tower examples used legacy regional control ARNs. Updated them to show the current global Control Catalog ARN format and note that the exact global IDs should come from the Control Catalog API.
- The CloudFormation baseline used invalid native CloudFormation resource types for account-level EBS encryption by default and account-level S3 Block Public Access. Replaced those invalid resources with a note that these account-level settings should be applied with Terraform, AWS CLI, or a custom resource.
- The DNS example implied that a private hosted zone itself was being shared directly through AWS RAM, then only created an authorization. Updated the text to distinguish Route 53 Profiles with RAM from direct cross-account private hosted zone association, and added the required `aws_route53_zone_association` step from the VPC-owning account.
- The preventive guardrail example used `AWS-GR_S3_ACCOUNT_LEVEL_PUBLIC_ACCESS_BLOCKS_PERIODIC`, which is detective rather than preventive. Changed the example to a preventive S3 control placeholder and clarified that preventive controls can use SCPs, RCPs, or declarative policies.
- The proactive RDS encryption example used `CT.RDS.PR.1`, which is a Multi-AZ control. Changed it to `CT.RDS.PR.24`, the RDS database instance encryption-at-rest proactive control.
- The explanation said proactive guardrails check CloudFormation templates before resources are created. Updated it to the more precise behavior: CloudFormation hooks check CloudFormation resources before create or update operations.
- The boto3 compliance report called `get_aggregate_compliance_details_by_config_rule` without the required `AwsRegion` parameter. Added `AwsRegion='us-east-1'`.
- The boto3 Organizations example used `Status`, which AWS currently recommends replacing with `State` before September 9, 2026. Updated the account activity check to use `State`.

## Review Notes
The examples remain illustrative and still assume supporting resources exist, such as OUs, provider aliases, Config aggregator setup, log buckets, and module implementations. Control Tower landing zone version 3.3 is valid for the shown schema, but current environments should evaluate newer landing zone versions before adopting the snippet unchanged.
