# Validation Summary: How to Use Variable Validation with Regex in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variable validation
- Terraform HCL string escaping
- Terraform `regex`, `can`, and `cidrhost` functions
- Regular expressions
- AWS S3 bucket naming
- AWS KMS and IAM ARNs
- Kubernetes namespace naming
- Semantic Versioning
- Docker image references

## Sources Consulted
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform validation overview: https://developer.hashicorp.com/terraform/language/validate
- Terraform `regex` function: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `can` function: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `cidrhost` function: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform strings and escape sequences: https://developer.hashicorp.com/terraform/language/expressions/strings
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS ARN reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- AWS KMS key ID and ARN documentation: https://docs.aws.amazon.com/kms/latest/developerguide/find-cmk-id-arn.html
- AWS IAM identifiers documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes object names documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Semantic Versioning 2.0.0 specification: https://semver.org/
- Docker image tag reference: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Distribution reference package: https://pkg.go.dev/github.com/distribution/reference

## Issues Found
- The S3 bucket validation was incomplete while presenting the pattern as matching S3 bucket rules. Updated the prose and validation condition to cover adjacent periods, periods next to hyphens, IP-address-style names, and AWS-reserved prefixes and suffixes from the current S3 naming rules.
- The Kubernetes section said namespace names follow DNS subdomain rules. Updated it to RFC 1123 DNS labels, which is what the Kubernetes namespace documentation requires.
- The first CIDR example described its regex-only check as validating a valid IPv4 CIDR block. Updated the error message to say it checks IPv4 CIDR notation; the later `cidrhost` example remains the validity check.
- The KMS and IAM ARN examples matched only the `aws` partition. Updated the regexes to also accept `aws-cn` and `aws-us-gov` partitions.
- The SemVer regex accepted values that are not valid SemVer 2.0.0, such as leading-zero versions, and did not allow build metadata. Replaced it with the official numbered-capture SemVer regex adapted for HCL string escaping.
- The Docker image reference regex allowed uppercase repository names, but Docker repository names must be lowercase. Updated the repository portion to lowercase, preserved uppercase support for tags, and allowed an optional registry port.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The snippets were reviewed manually against official Terraform language documentation.
- The email, ARN, and Docker examples are still pragmatic regex validations, not exhaustive parsers for every edge case. The post now avoids the main incorrect claims found during review.
