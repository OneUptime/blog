# Validation Summary: How to Implement Defense in Depth on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS WAF
- Amazon CloudFront
- AWS Shield Advanced
- Amazon VPC
- Network ACLs
- Security Groups
- AWS Systems Manager documents
- IAM policies
- AWS KMS
- Amazon S3 server-side encryption
- Amazon GuardDuty
- boto3
- Terraform
- CloudFormation

## Sources Consulted
- AWS CloudFormation `AWS::WAFv2::WebACL`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-wafv2-webacl.html
- AWS WAF baseline managed rule groups: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html
- Amazon VPC custom network ACLs: https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS Systems Manager document schemas: https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html
- Boto3 GuardDuty `create_detector`: https://docs.aws.amazon.com/boto3/latest/reference/services/guardduty/client/create_detector.html
- IAM `Resource` policy element: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_resource.html
- Amazon S3 default server-side encryption: https://docs.aws.amazon.com/console/s3/bucket-encryption
- AWS KMS automatic key rotation: https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-enable-disable.html

## Issues Found
- The edge protection section said the CloudFormation template created a CloudFront distribution with WAF and Shield Advanced protection, but the snippet only defines an `AWS::WAFv2::WebACL`. Updated the text to say it creates a CloudFront-scoped WAF web ACL, note the `us-east-1` requirement, and explain that Shield Advanced mitigation rules are managed by AWS.
- The WAF managed rules section said managed rules cover the OWASP Top 10 out of the box. AWS describes the Core Rule Set as covering a wide range of vulnerabilities, including some high-risk issues described in OWASP publications. Updated the claim to avoid overstating coverage.
- The network ACL example allowed outbound HTTPS but did not allow inbound ephemeral return traffic, which is required because NACLs are stateless. Added an inbound ephemeral-port allow rule and separated outbound VPC traffic from outbound HTTPS.
- The Systems Manager example was labeled as an Automation document, but schema version `2.2` with `aws:runShellScript` is a Command document pattern. Updated the label.
- The Systems Manager shell commands used `yum-cron`, which is specific to Amazon Linux 2 and similar yum-based distributions, while the surrounding text implied all EC2 instances. Narrowed the text to Amazon Linux 2 and made the SSH configuration edits match commented or existing directives.
- The IAM guidance said never to use wildcard permissions in production, but AWS documents cases where `Resource: "*"` is required for actions that do not support resource-level permissions. Reworded the guidance to avoid broad wildcards and scope permissions wherever supported.
- The GuardDuty section said the script enabled automated response through EventBridge, but the script only creates GuardDuty detectors. Updated the description and removed an unused `json` import.

## Review Notes
The Terraform snippets remain illustrative and reference resources such as subnets, security groups, and buckets that are not defined in the excerpt. They are acceptable as partial examples, but a future revision could call out prerequisites or provide a complete deployable module.
