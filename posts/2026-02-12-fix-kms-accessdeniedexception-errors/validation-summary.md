# Validation Summary: How to Fix KMS 'AccessDeniedException' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Key Management Service (AWS KMS)
- AWS Identity and Access Management (IAM)
- AWS KMS key policies and grants
- AWS CLI
- AWS CloudTrail
- Amazon VPC interface endpoints and endpoint policies

## Sources Consulted
- AWS KMS key policies: https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- AWS KMS default key policy: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- Using IAM policies with AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/iam-policies.html
- Specifying KMS keys in IAM policy statements: https://docs.aws.amazon.com/kms/latest/developerguide/cmks-in-iam-policies.html
- Allowing users in other AWS accounts to use a KMS key: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- AWS KMS grants: https://docs.aws.amazon.com/kms/latest/developerguide/grants.html
- Controlling access to grants: https://docs.aws.amazon.com/kms/latest/developerguide/grant-authorization.html
- AWS KMS condition keys, including kms:ViaService: https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- AWS KMS key states: https://docs.aws.amazon.com/kms/latest/developerguide/key-state.html
- AWS KMS VPC endpoints: https://docs.aws.amazon.com/kms/latest/developerguide/kms-vpc-endpoint.html
- AWS CLI cloudtrail lookup-events command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS CLI ec2 describe-vpc-endpoints command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoints.html

## Issues Found
- The post described KMS authorization as a strict two-party model where both key policy and IAM policy must allow every request. AWS documents KMS authorization as involving key policies, IAM policies, and grants; IAM policies are optional unless the key policy delegates access control to IAM. Updated the introduction and permissions section to describe the layered model accurately.
- The post listed disabled or pending-deletion keys as a direct cause of `AccessDeniedException`. AWS documents these key states as causing state-related errors such as `DisabledException` or `KMSInvalidStateException` for cryptographic operations. Updated the section to keep the troubleshooting check while clarifying the expected error type.
- The conclusion repeated the strict key-policy-plus-IAM framing. Updated it to mention key policies, IAM policies, and grants, and to focus on identifying the effective permission path.

## Review Notes
The AWS CLI commands and JSON policy snippets are syntactically plausible and match current AWS documentation. The local environment did not have the AWS CLI installed, so CLI flags were verified against official AWS CLI documentation rather than local `aws --help` output.
