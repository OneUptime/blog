# Validation Summary: How to Create S3 Buckets with Server-Side Encryption in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon S3
- AWS KMS
- S3 server-side encryption: SSE-S3, SSE-KMS, DSSE-KMS
- S3 Bucket Keys
- S3 bucket policies

## Sources Consulted
- AWS S3 User Guide: Setting default server-side encryption behavior for Amazon S3 buckets - https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html
- AWS S3 User Guide: Using server-side encryption with Amazon S3 managed keys (SSE-S3) - https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html
- AWS S3 User Guide: Using server-side encryption with AWS KMS keys (SSE-KMS) - https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- AWS S3 API Reference: ServerSideEncryptionRule - https://docs.aws.amazon.com/AmazonS3/latest/API/API_ServerSideEncryptionRule.html
- AWS CloudFormation Template Reference: AWS::S3::Bucket ServerSideEncryptionByDefault - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-serversideencryptionbydefault.html
- Terraform AWS Provider source docs: aws_s3_bucket_server_side_encryption_configuration - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- Terraform AWS Provider source docs: aws_kms_key - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/kms_key.html.markdown
- Terraform AWS Provider source docs: aws_kms_alias - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/kms_alias.html.markdown
- OpenTofu CLI docs: init, plan, and apply - https://opentofu.org/docs/cli/commands/init/, https://opentofu.org/docs/cli/commands/plan/, https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The post claimed it covered SSE-S3, SSE-KMS, and DSSE-KMS, but the implementation examples only covered SSE-S3 and SSE-KMS. Updated the description and introduction to accurately state that the guide covers SSE-S3 and SSE-KMS with a customer-managed KMS key, while still mentioning DSSE-KMS as an available S3 option.
- The post described SSE-S3 as using "AWS-managed keys." AWS documentation identifies SSE-S3 as using Amazon S3 managed keys, which is distinct from AWS KMS AWS managed keys. Updated the introduction, Step 3 heading, and SSE-S3 code comment.
- The SSE-KMS configuration comment said `bucket_key_enabled = true` enforced S3 Bucket Keys. AWS documents this setting as enabling S3 Bucket Keys for new objects under SSE-KMS, so the comment was changed from "Enforce" to "Enable."
- The bucket policy statement SID `DenyNonBucketKeyUploads` checked `s3:x-amz-server-side-encryption-aws-kms-key-id`, which enforces the KMS key ID rather than S3 Bucket Key usage. Renamed the SID to `DenyWrongKMSKey` to match the actual condition.

## Review Notes
The HCL resource names and arguments used in the examples are current in the AWS provider documentation. `sse_algorithm = "AES256"` for SSE-S3, `sse_algorithm = "aws:kms"` with `kms_master_key_id`, `bucket_key_enabled = true`, the KMS key and alias resources, the S3 public access block arguments, and the `tofu init`, `tofu plan`, and `tofu apply` commands were verified. The bucket policy intentionally requires callers to send SSE-KMS headers with the configured key; this is stricter than relying only on bucket default encryption.
