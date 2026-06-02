# Validation Summary: How to Use KMS Key Policies for Access Control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Key Management Service (AWS KMS)
- KMS key policies
- AWS Identity and Access Management (IAM)
- AWS KMS grants
- AWS CLI
- Terraform AWS provider
- AWS CloudTrail

## Sources Consulted
- AWS KMS Developer Guide: Key policies in AWS KMS - https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- AWS KMS Developer Guide: Default key policy - https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- AWS KMS Developer Guide: Allowing users in other accounts to use a KMS key - https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- AWS KMS Developer Guide: AWS KMS condition keys - https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- AWS KMS Developer Guide: Encryption context - https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html
- AWS KMS Developer Guide: Grants in AWS KMS - https://docs.aws.amazon.com/kms/latest/developerguide/grants.html
- AWS CLI Command Reference: kms get-key-policy - https://docs.aws.amazon.com/cli/latest/reference/kms/get-key-policy.html
- AWS CLI Command Reference: kms put-key-policy - https://docs.aws.amazon.com/cli/latest/reference/kms/put-key-policy.html
- AWS CLI Command Reference: kms create-grant - https://docs.aws.amazon.com/cli/latest/reference/kms/create-grant.html
- AWS CLI Command Reference: cloudtrail lookup-events - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Terraform Registry: aws_kms_key resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key

## Issues Found
- The authorization model was described as requiring both the key policy and IAM policy to allow every action. AWS KMS always requires a key policy, but access can be authorized through a key policy, IAM policy enabled by the key policy, or grants. Updated the wording to distinguish IAM-delegated access from direct key policy and grant authorization.
- The default key policy was described as granting access to the root account. AWS documents the `arn:aws:iam::<account-id>:root` principal as the AWS account principal, which enables IAM policy delegation rather than directly granting every IAM principal access. Updated the explanation to use account-principal terminology and to note that this default applies to programmatic key creation without a supplied policy.
- The `get-key-policy` verification command piped the full CLI response to `python3 -m json.tool`. The policy document is returned in the `Policy` field, and AWS CLI examples use `--query Policy --output text` to extract it. Added `--query Policy` to both `get-key-policy` command examples.
- Grants were described as an alternative to key policies. AWS describes grants as considered alongside key policies and IAM policies, while every KMS key must still have a key policy. Updated the wording accordingly.
- The audit command comment used the deprecated term "CMK". Updated it to "KMS keys" to match current AWS terminology.

## Review Notes
The remaining policy snippets, KMS condition keys, cross-account access flow, grant command options, CloudTrail lookup command, and Terraform `aws_kms_key` policy usage were consistent with the official documentation consulted.
