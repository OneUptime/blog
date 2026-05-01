# Validation Summary: How to Create Encrypted EBS Volumes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS
- Amazon EBS
- AWS KMS
- EC2 launch templates

## Sources Consulted
- AWS: Amazon EBS encryption — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html
- AWS: Enable Amazon EBS encryption by default — https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- AWS: Copy an Amazon EBS snapshot — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html
- AWS: Requirements for Amazon EBS encryption — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption-requirements.html
- AWS KMS: Default key policy — https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- AWS EC2: Reference the latest AMIs using Systems Manager public parameters — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html
- OpenTofu CLI: `init` — https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI: `plan` — https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI: `apply` — https://opentofu.org/docs/cli/commands/apply/
- AWS provider docs: `aws_ebs_volume` — https://registry.terraform.io/providers/-/aws/latest/docs/resources/ebs_volume
- AWS provider docs: `aws_launch_template` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider docs: `aws_ebs_default_kms_key` — https://registry.terraform.io/providers/hashicorp/aws/3.75.1/docs/resources/ebs_default_kms_key

## Issues Found
- The custom KMS key policy in Step 1 was not a correct EBS usage pattern. It granted limited permissions directly to the EC2 service principal and omitted the documented EBS KMS permission model and grant guidance. I removed the custom policy so the example uses the AWS KMS default key policy instead.
- Step 2 and the conclusion described EBS encryption by default as account-wide or account-level. AWS documents this as a Region-specific setting, so I corrected the heading, comments, and conclusion wording.
- The launch template referenced `data.aws_ami.amazon_linux.id`, but no corresponding data source was defined. I replaced it with the supported `resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64` image reference.
- I updated the key terminology in the introduction and one inline comment to use current AWS wording (`aws/ebs`, customer-managed KMS key) instead of older CMK phrasing where it affected precision.

## Review Notes
- The post is technically valid after the fixes above.
- The `tofu` binary was not installed in the local review environment, so CLI commands were verified against the official OpenTofu documentation rather than local `--help` output.
- The post remains a focused snippet-based guide and assumes surrounding provider configuration and input variable declarations exist elsewhere in the reader's OpenTofu configuration.
