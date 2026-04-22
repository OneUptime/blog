# Validation Summary: How to Create S3 Bucket Policies with OpenTofu

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon S3 buckets
- Amazon S3 bucket policies
- Amazon S3 Block Public Access
- AWS IAM policy documents and resource-based policies
- S3 condition keys for SSE-KMS, TLS, VPC endpoints, and list prefixes
- Amazon CloudFront Origin Access Control
- AWS KMS and SSE-KMS

## Sources Consulted
- OpenTofu v1.6 CLI command documentation: https://opentofu.org/docs/v1.6/cli/commands/init/, https://opentofu.org/docs/v1.6/cli/commands/plan/, https://opentofu.org/docs/v1.6/cli/commands/apply/
- OpenTofu v1.6 resource syntax documentation: https://opentofu.org/docs/v1.6/language/resources/syntax/
- Terraform AWS Provider source docs: `aws_s3_bucket` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket.html.markdown
- Terraform AWS Provider source docs: `aws_s3_bucket_policy` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_policy.html.markdown
- Terraform AWS Provider source docs: `aws_s3_bucket_public_access_block` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_public_access_block.html.markdown
- Terraform AWS Provider source docs: `aws_iam_policy_document` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/iam_policy_document.html.markdown
- Amazon S3 bucket policy examples using condition keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Amazon S3 VPC endpoint bucket policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html
- Amazon VPC gateway endpoints for Amazon S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- Amazon S3 security best practices: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html
- AWS IAM policy evaluation logic: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
- AWS IAM condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM Principal element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- Amazon CloudFront OAC for S3 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Issues Found
- The description claimed the guide restricted access to VPCs or IP ranges, but the implementation uses a VPC endpoint condition. Updated the description, matching `Blogs.json` metadata, and introduction to accurately describe VPC endpoint access and the SSE-KMS upload requirement.
- The upload-deny statement was described as denying unencrypted uploads, but modern S3 encrypts new objects by default and the policy specifically requires the `aws:kms` server-side encryption header. Updated the comment and SID to describe SSE-KMS enforcement.
- The TLS deny statement used `aws:SecureTransport` without excluding AWS service principals. AWS documents that service-to-service requests can have network context redacted, so added `aws:PrincipalIsAWSService = false` to avoid unintentionally blocking AWS services.
- The VPC endpoint statement was only a conditional `Allow`, which does not enforce endpoint-only access if another identity or resource policy allows the same principal. Added an explicit `Deny` for the application role outside the configured VPC endpoint and kept the conditional allow for requests through the endpoint.
- The cross-account read statement allowed `s3:ListBucket` on the full bucket while object reads were scoped to `shared/*`. Split the statement into prefix-scoped `ListBucket` access using `s3:prefix` and object read access for `shared/*`.
- The CloudFront example used legacy OAI even though the policy enforces SSE-KMS uploads. AWS recommends OAC, and OAI does not support SSE-KMS origins. Replaced the OAI principal with the CloudFront service principal and an `AWS:SourceArn` condition for the distribution.
- The conclusion implied bucket policies alone complete cross-account access. Added the caveat that the external account must still grant its own principals corresponding IAM permissions.
- The conclusion omitted the KMS permission requirement for CloudFront serving SSE-KMS objects. Added a note to grant the distribution permission to use the KMS key.

## Review Notes
The AWS provider resource names and arguments used in the examples are current: `aws_s3_bucket`, `aws_s3_bucket_public_access_block`, `aws_s3_bucket_policy`, and `data.aws_iam_policy_document`. The `tofu init`, `tofu plan`, and `tofu apply` commands are valid OpenTofu commands. `tofu` and `terraform` are not installed in this workspace, so the snippets were reviewed against official documentation rather than validated with the CLI. The examples still assume provider configuration, input variable declarations, runtime IAM permissions, and any required KMS key policy statements are defined outside the shown snippets.
