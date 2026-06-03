# Validation Summary: How to Set Up AWS Verified Access for Zero Trust

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Verified Access
- AWS CLI
- AWS CloudFormation
- Cedar policy language
- OpenID Connect identity providers
- CrowdStrike device trust
- Amazon Route 53
- Amazon CloudWatch Logs

## Sources Consulted
- AWS CLI Command Reference: create-verified-access-trust-provider: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-verified-access-trust-provider.html
- AWS CLI Command Reference: create-verified-access-instance: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-verified-access-instance.html
- AWS CLI Command Reference: create-verified-access-group: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-verified-access-group.html
- AWS CLI Command Reference: modify-verified-access-group-policy: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-verified-access-group-policy.html
- AWS CLI Command Reference: create-verified-access-endpoint: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-verified-access-endpoint.html
- AWS CLI Command Reference: modify-verified-access-instance-logging-configuration: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-verified-access-instance-logging-configuration.html
- AWS Verified Access User Guide: Verified Access example policies: https://docs.aws.amazon.com/verified-access/latest/ug/trust-data-iam-add-pol.html
- AWS Verified Access User Guide: Third-party trust provider context for Verified Access trust data: https://docs.aws.amazon.com/verified-access/latest/ug/trust-data-third-party-trust.html
- AWS Verified Access User Guide: Device-based trust providers: https://docs.aws.amazon.com/verified-access/latest/ug/device-trust.html
- AWS CloudFormation Template Reference: AWS::EC2::VerifiedAccessInstance: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-verifiedaccessinstance.html
- AWS CloudFormation Template Reference: AWS::EC2::VerifiedAccessGroup: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-verifiedaccessgroup.html
- AWS CloudFormation Template Reference: AWS::EC2::VerifiedAccessEndpoint: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-verifiedaccessendpoint.html
- Cedar Policy Language Reference: Operators: https://docs.cedarpolicy.com/policies/syntax-operators.html

## Issues Found
- The AWS CLI create commands used `--tags`, which is not a valid option for these EC2 Verified Access create operations. Updated the examples to use `--tag-specifications` with the correct Verified Access resource types.
- The OIDC group checks used `context.okta.groups has "..."`. AWS examples for third-party identity provider group arrays use `.contains(...)`, so the Okta group checks were updated accordingly.
- The CrowdStrike policy examples referenced undocumented fields such as `overall_assessment`, `os_version`, and `sensor_status`. Updated them to use the documented CrowdStrike context fields under `context.crowdstrike.assessment`, including `overall`, `os`, and `sensor_config`.
- The text described CrowdStrike as returning a pass/fail assessment. Updated it to match the documented numeric overall assessment score.
- The complex policy comment claimed "manager approval" but no approval condition existed in the policy. Updated the comment to describe the actual group and device posture checks.
- The sample Verified Access endpoint DNS name used an outdated/inaccurate shape. Updated it to match the documented generated endpoint domain pattern that includes an edge identifier and `prod.verified-access`.

## Review Notes
- The AWS CLI was not installed in the local environment, so command verification was performed against the current official AWS CLI command reference instead of local `aws --help` output.
- Device trust policies require appropriate client-side components such as the AWS Verified Access browser extension and, for CrowdStrike, the AWS Verified Access Native Messaging Host. The post's core setup remains valid, but a future expansion could call this out explicitly.
