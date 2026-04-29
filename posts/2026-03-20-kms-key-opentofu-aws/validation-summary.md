# Validation Summary: How to Create a KMS Key with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS KMS
- AWS IAM key policies
- AWS KMS grants
- Amazon CloudWatch Logs
- HashiCorp AWS provider

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- AWS provider `aws_kms_key` resource docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_key.html.markdown
- AWS provider `aws_kms_alias` resource docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_alias.html.markdown
- AWS provider `aws_kms_grant` resource docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_grant.html.markdown
- Default key policy - AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- Key policies in AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- Encrypt log data in CloudWatch Logs using AWS Key Management Service: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- Grants in AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/grants.html
- GrantConstraints - AWS KMS API Reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GrantConstraints.html
- Encryption context - AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html
- Rotate AWS KMS keys: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- Multi-Region keys in AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html
- Basic concepts - AWS KMS: https://docs.aws.amazon.com/kms/latest/cryptographic-details/basic-concepts.html
- AWS KMS keys: https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html

## Issues Found
- The asymmetric key example used `key_spec`, but the official `aws_kms_key` resource argument is `customer_master_key_spec`. I updated the code to use the supported argument.
- The key policy comment and SID around `arn:aws:iam::<account-id>:root` implied only the root user had full access. In AWS KMS, that principal represents the account and enables IAM-based delegation, so I updated the comment and SID to match the official semantics.
- The `multi_region = false` comment described a multi-Region/cross-Region key even though the example creates a single-Region key. I corrected the comment.
- The grant section described the example as temporary access and implied the encryption-context constraint applied to all granted operations. Grants are only temporary if retired or revoked, and encryption-context constraints apply only to supported cryptographic operations, so I corrected the wording.
- The post used older "CMK" terminology and an overly absolute recommendation to always use customer-managed keys. I updated the terminology to current AWS KMS wording and changed the conclusion to reflect AWS guidance more accurately.

## Review Notes
- The post pins the AWS provider to `~> 5.0`. The configuration pattern is still valid, but current official provider documentation is published under a newer major release, so that version pin should be rechecked on future refreshes.
- The CloudWatch Logs key policy example is valid, but AWS documentation recommends adding tighter conditions such as `kms:EncryptionContext:aws:logs:arn` and considering `kms:ViaService` for stricter least-privilege access.
