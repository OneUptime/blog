# Validation Summary: How to Use Test Helpers for Common Terraform Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform native test framework
- Terratest
- Go
- AWS SDK for Go v2
- Amazon EC2 / VPC / security groups
- Testify assertions

## Sources Consulted
- Terraform test language documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform test file documentation: https://developer.hashicorp.com/terraform/language/files/tests
- Terraform test command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terratest terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest retry package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/retry
- AWS SDK for Go documentation: https://docs.aws.amazon.com/sdk-for-go/
- AWS SDK for Go v2 configuration documentation: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html
- AWS SDK for Go v2 migration documentation: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/migrate-gosdk.html
- AWS announcement for AWS SDK for Go v1 end-of-support: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-go-v1-on-july-31-2025/
- Amazon EC2 DescribeSecurityGroups API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeSecurityGroups.html
- Go testing package documentation: https://pkg.go.dev/testing
- Testify assert package documentation: https://pkg.go.dev/github.com/stretchr/testify/assert
- Testify require package documentation: https://pkg.go.dev/github.com/stretchr/testify/require
- Related OneUptime links in the post were checked and resolved successfully.

## Issues Found
- The introductory Terratest example used `map[string]interface{}{...}`, which is not valid Go syntax. Replaced it with a concrete map value.
- `test/helpers/assertions.go` used `fmt.Sprintf` in `AssertAWSResourceID` but did not import `fmt`. Added the missing import.
- `test/helpers/retry.go` used `http.Get` but did not import `net/http`. Added the missing import.
- `test/helpers/aws.go` used AWS SDK for Go v1 imports and APIs. AWS SDK for Go v1 reached end-of-support on July 31, 2025, so the snippet was updated to AWS SDK for Go v2 using `config.LoadDefaultConfig`, `ec2.NewFromConfig`, v2 EC2 input types, and `aws.ToString` / `aws.ToInt32` helpers.
- `ModuleOptions` mutated the caller-provided `vars` map when injecting `name_prefix`, which is risky for reused maps and parallel tests. Updated it to copy the map first.
- `AssertSecurityGroupAllowsPort` only checked numeric port ranges and did not account for all-protocol security group rules. Updated it to treat `IpProtocol == "-1"` as allowing the requested port.

## Review Notes
- The Terraform native test examples match the documented `run`, `variables`, `module`, and `assert` syntax. The exact module path assumes the tests are run from the root Terraform configuration directory, which matches Terraform's documented test execution model.
- The Terratest retry and Terraform option fields shown are still present in Terratest documentation.
- I could not run Go compilation locally because the `go` binary is not installed in this environment; the snippets were checked against current package documentation instead.
