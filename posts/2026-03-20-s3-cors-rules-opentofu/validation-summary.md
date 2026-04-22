# Validation Summary: How to Configure S3 CORS Rules with OpenTofu

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon S3 bucket CORS configuration
- Amazon S3 Block Public Access
- Amazon CloudFront Origin Access Control
- AWS Lambda with Python and Boto3
- S3 presigned upload URLs
- Browser CORS and preflight requests
- curl

## Sources Consulted
- OpenTofu 1.6 CLI command documentation: https://opentofu.org/docs/v1.6/cli/commands/
- OpenTofu 1.6 dynamic blocks documentation: https://opentofu.org/docs/v1.6/language/expressions/dynamic-blocks/
- HashiCorp AWS provider `aws_s3_bucket_cors_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_cors_configuration
- HashiCorp AWS provider `aws_s3_bucket_public_access_block` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- HashiCorp AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Amazon S3 CORS configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html
- Amazon S3 Block Public Access documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Amazon CloudFront Origin Access Control for S3 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon S3 presigned URL documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- Boto3 `generate_presigned_url` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/generate_presigned_url.html
- Boto3 `put_object` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html
- Amazon API Gateway CORS documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

## Issues Found
- The S3 public access block example disabled `block_public_policy` and `restrict_public_buckets` with a comment saying this allowed a CloudFront bucket policy. CloudFront OAC uses a service-principal bucket policy and does not require a public bucket policy, while AWS recommends enabling all four Block Public Access settings. Changed both settings to `true`.
- The direct upload CORS rule allowed both `PUT` and `POST`, but the Lambda example generates a `PUT` presigned URL with `put_object`. Narrowed the rule to `PUT` so the CORS rule matches the implementation.
- The Lambda example returned `Access-Control-Allow-Origin` and `Access-Control-Allow-Methods` but omitted `Access-Control-Allow-Headers`. Added `Access-Control-Allow-Headers: Content-Type` to align with API Gateway Lambda proxy CORS guidance for JSON requests.
- The Lambda accepted a client-provided `contentType` without validation, while the conclusion recommended content-type restrictions. Added a server-side allowlist before creating the signed URL.
- The CORS preflight test requested only `Content-Type`, but the generated PUT URL signs `ServerSideEncryption`, which requires the browser upload to send `x-amz-server-side-encryption`. Updated the curl preflight request to include both headers.
- The conclusion described specific `allowed_origins` as preventing unauthorized cross-origin access. Updated the wording to clarify that CORS limits which browser origins can read responses, but is not an authorization mechanism.

## Review Notes
The Python Lambda snippet was syntax-checked locally with Python 3.12. `tofu` and `terraform` were not installed in the review environment, so the OpenTofu syntax, commands, and AWS provider resources were reviewed against official documentation rather than validated with the CLI. The examples still assume provider configuration, variable declarations, IAM permissions, KMS permissions if needed, and any API Gateway/Lambda preflight route are configured outside the shown snippets.
