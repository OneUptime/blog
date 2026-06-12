# Validation Summary: How to Test Terraform with Terratest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terratest
- Go
- AWS EC2
- AWS S3
- HTTP endpoint testing
- SSH testing
- GitHub Actions

## Sources Consulted
- Terratest official documentation: https://terratest.gruntwork.io/docs/
- Terratest GitHub README and release information: https://github.com/gruntwork-io/terratest
- Terratest v1.0 release announcement: https://www.gruntwork.io/blog/terratest-1-0-released
- Terratest terraform module source: https://github.com/gruntwork-io/terratest/tree/main/modules/terraform
- Terratest AWS module source: https://github.com/gruntwork-io/terratest/tree/main/modules/aws
- Terratest HTTP helper module source: https://github.com/gruntwork-io/terratest/tree/main/modules/http-helper
- Terratest SSH module source: https://github.com/gruntwork-io/terratest/tree/main/modules/ssh
- Go package documentation for Terratest modules: https://pkg.go.dev/github.com/gruntwork-io/terratest
- GitHub Actions setup-go documentation: https://github.com/actions/setup-go
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- AWS configure-aws-credentials action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The setup commands installed only a Terratest subpackage. Changed the command to `go get github.com/gruntwork-io/terratest@latest`, matching the current Terratest installation guidance.
- Several examples used deprecated Terratest v1 helper APIs without contexts. Updated Terraform, AWS, HTTP, and SSH calls to the current context-aware helpers.
- The S3 example used `fmt.Sprintf` without importing `fmt`. Added the missing import.
- The S3 example set `awsRegion` for assertions but did not pass the region into Terraform. Added `AWS_DEFAULT_REGION` to the Terraform options.
- The EC2 example used non-existent Terratest helpers: `aws.GetInstanceByTag` and `aws.GetInstanceState`. Replaced them with current Terratest AWS helpers that verify the instance ID by tag and read EC2 tags.
- The table-driven, staged, and plan-only examples referenced packages or helpers without imports. Added minimal imports where the snippets are intended to stand alone.
- The plan-only example used separate deprecated `Init` and `Plan` helpers. Updated it to `InitAndPlanContext`.
- The CI example used Go 1.21 while current Terratest latest requires Go 1.26 or later. Updated the workflow to Go 1.26.
- The CI example used older GitHub Action major versions and omitted OIDC permissions for assuming an AWS role. Updated the action versions where needed and added `id-token: write` and `contents: read` permissions.

## Review Notes
The examples remain illustrative and depend on the referenced Terraform modules exposing the documented variables and outputs. The S3 policy assertion assumes the module creates a bucket policy; if the module intentionally has no bucket policy, that assertion should be removed or adjusted in a future post.
