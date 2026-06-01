# Validation Summary: How to Verify Email Addresses in Amazon SES

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Simple Email Service (Amazon SES)
- AWS CLI
- Amazon SES v2 API
- Boto3 for Python
- AWS CloudFormation
- Terraform AWS provider
- Amazon Route 53 DNS records

## Sources Consulted
- AWS CLI Command Reference: `verify-email-identity` - https://docs.aws.amazon.com/cli/latest/reference/ses/verify-email-identity.html
- AWS CLI Command Reference: `get-identity-verification-attributes` - https://docs.aws.amazon.com/cli/latest/reference/ses/get-identity-verification-attributes.html
- AWS CLI Command Reference: `send-email` - https://docs.aws.amazon.com/cli/latest/reference/ses/send-email.html
- AWS CLI Command Reference: `create-email-identity` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-email-identity.html
- AWS CLI Command Reference: `list-email-identities` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/list-email-identities.html
- Amazon SES Developer Guide: Verified identities in Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html
- Amazon SES Developer Guide: Creating and verifying identities - https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- Amazon SES Developer Guide: Verifying your domain for Amazon SES email receiving - https://docs.aws.amazon.com/ses/latest/dg/receiving-email-verification.html
- AWS CloudFormation Reference: `AWS::SES::EmailIdentity` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ses-emailidentity.html
- Terraform Registry: `aws_ses_email_identity` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_email_identity

## Issues Found
- The post said `get-identity-verification-attributes` shows either `Pending` or `Success`. AWS documents additional possible states, including `Failed`, `TemporaryFailure`, and `NotStarted`, so the text now says those are also possible.
- The SES v2 `list-email-identities` example labeled `SendingEnabled` as `Status`, which could be confused with identity verification status. The query now includes both `VerificationStatus` and `SendingEnabled`.
- The Terraform output was named `sender_verification_status` but returned the identity ARN. The output is now named `sender_identity_arn`.

## Review Notes
The AWS CLI was not installed in the local workspace, so command syntax was verified against the official AWS CLI command reference rather than local `--help` output. The examples use current AWS CLI commands and active SES APIs. SES identity verification is Region-specific, which the examples handle by consistently passing `--region us-east-1`.
