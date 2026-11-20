# Validation Summary: SSM Parameter Store `AccessDeniedException`: Check IAM, Paths, and KMS

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI commands and an IAM JSON policy.

## Technologies Covered
- AWS Systems Manager Parameter Store and SecureString parameters
- AWS Identity and Access Management (IAM), role sessions, permissions boundaries, and organization policies
- AWS Key Management Service (KMS), key policies, grants, and encryption context
- AWS CLI v2, AWS STS, Bash, JSON, and JMESPath
- Amazon VPC interface endpoint policies
- AWS Resource Access Manager (RAM) cross-account parameter sharing

## Sources Consulted
- [STS get-caller-identity CLI reference](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [SSM get-parameter CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html)
- [Parameter retrieval authorization](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-retrieval-authorization.html)
- [Restricting access to parameters and paths](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-restrict-parameter-access.html)
- [Systems Manager actions and resource types](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)
- [Setting up Parameter Store and IAM permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-setting-up.html)
- [AWS CLI output filtering](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html)
- [SecureString encryption, decryption, and encryption context](https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html)
- [SSM describe-parameters CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-parameters.html)
- [Specifying KMS keys in IAM policies](https://docs.aws.amazon.com/kms/latest/developerguide/cmks-in-iam-policies.html)
- [KMS condition keys, including kms:ViaService](https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html#conditions-kms-via-service)
- [KMS key access and permissions](https://docs.aws.amazon.com/kms/latest/developerguide/control-access.html)
- [Changing KMS key policies](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying.html)
- [Cross-account KMS authorization](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html)
- [IAM policies and permissions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [Systems Manager VPC endpoints and endpoint policies](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [Shared Parameter Store parameters](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-shared-parameters.html)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed on 2026-11-20. The post is technically relevant and its README.md was left unchanged.
- Confirmed the four retrieval APIs authorize independently. History includes the current version, and path retrieval authorizes the requested path rather than individually authorizing returned parameters. The ancestor-path warning agrees with AWS guidance.
- Confirmed parameter ARN formatting and the exact SSM action and resource in the example policy.
- Checked all CLI command names, flags, and response fields against AWS CLI documentation. Both Bash code blocks passed `bash -n`; the policy block parsed successfully as JSON. The commands use AWS CLI v2 options, including `--no-cli-pager`.
- Confirmed that `--query` filters client-side output. The projection omits parameter values from displayed output while a decrypted response still reaches the process, as the post explains.
- Confirmed that standard and advanced SecureString reads with decryption require `kms:Decrypt`. The key ARN, `PARAMETER_ARN` context condition, and SSM ViaService value are appropriate for the stated account and Region example.
- Confirmed the key-policy prerequisite for IAM authorization, AWS-managed key policy restrictions, and cross-account advanced-tier and customer-managed-key requirements. The alias/version caveat is appropriate because metadata alone may not identify the key used for a requested historical version.
- Confirmed that explicit denies and applicable endpoint policies can prevent access despite an identity-policy allow. The example correctly warns that its conditions do not restrict permissions granted elsewhere.
- All referenced documentation URLs resolved to relevant AWS resources. The author profile URL also resolved successfully.
- No deprecated APIs or flags were found in the examples. No live AWS requests, policy deployment, or secret retrieval were performed; actual authorization depends on the application's credentials and complete deployed policy set.
