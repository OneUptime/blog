# Validation Summary: How to Write Terratest Tests for AWS Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terratest
- AWS
- AWS SDK for Go v2
- Go testing
- Testify
- PostgreSQL with `github.com/lib/pq`

## Sources Consulted
- Terratest `aws` package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/aws
- Terratest `terraform` package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest `retry` package source: https://github.com/gruntwork-io/terratest/blob/v1.0.0/modules/retry/retry.go
- Terratest `random` package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/random
- AWS SDK for Go v2 configuration documentation: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html
- AWS SDK for Go v2 package documentation: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2
- AWS SDK for Go v1 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-go-v1-on-july-31-2025/
- AWS Lambda supported runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Go command documentation for `go test` flags: https://go.dev/cmd/go/
- `github.com/lib/pq` package documentation: https://pkg.go.dev/github.com/lib/pq

## Issues Found
- The setup command installed only `github.com/gruntwork-io/terratest/modules/aws`, but the examples also import Terraform, random, retry, AWS SDK for Go v2, `lib/pq`, and Testify packages. Expanded the `go get` command to include the packages used by the examples.
- The VPC example used deprecated or nonexistent Terratest helpers, including `GetVpcById` and `GetSubnetById`. Updated it to current context-aware helpers: `GetVpcByIDContext`, `GetSubnetsForVpcContext`, and `IsPublicSubnetContext`.
- The EC2 example omitted the `random` import and used nonexistent helpers such as `GetInstanceById` and `GetInstanceStatus`. Reworked it to use AWS SDK for Go v2 `DescribeInstances` and `DescribeInstanceStatus`, while keeping Terratest helpers for tags and public IP lookup.
- The S3 example used nonexistent `GetS3BucketEncryption` and deprecated non-context helpers. Replaced them with `AssertS3BucketServerSideEncryptionContext`, `AssertS3BucketExistsContext`, `GetS3BucketVersioningContext`, `GetS3BucketPolicyContext`, and `GetS3BucketTagsContext`. Also corrected the text from lifecycle policy validation to bucket policy validation because the code does not test lifecycle rules.
- The RDS example used a generic `db_endpoint` output in a `host=%s port=%s` PostgreSQL connection string. Changed it to `db_address` so the example expects a hostname/address separate from the port.
- The IAM example used nonexistent Terratest helpers and attempted to unmarshal IAM's assume role policy document without URL-decoding it. Reworked the example to use AWS SDK for Go v2 `GetRole` and `ListAttachedRolePolicies`, and decode the returned policy document before JSON parsing.
- The security group example used AWS SDK for Go v1, which reached end-of-support on July 31, 2025. Updated it to AWS SDK for Go v2 and made the all-traffic check handle both `IpProtocol == "-1"` and TCP 0-65535.
- The Lambda example used deprecated `InvokeFunction`. Updated it to `InvokeFunctionContext`.

## Review Notes
- The local environment did not have the `go` binary installed, so examples were checked against official package documentation and upstream source rather than compiled locally.
- The Azure and GCP cross-links in the summary returned HTTP 200.
