# Validation Summary: How to Use the regex Function to Validate Input in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform `regex`, `regexall`, `can`, `alltrue`, and `cidrhost` functions
- Terraform variable validation blocks
- AWS S3 bucket naming
- Azure resource group naming
- Google Cloud project ID naming
- AWS IAM ARNs and IAM name requirements
- Kubernetes namespace naming
- Docker image tag syntax
- Semantic Versioning

## Sources Consulted
- Terraform `regex` function documentation: https://docs.hashicorp.com/terraform/language/functions/regex
- Terraform `regexall` function documentation: https://docs.hashicorp.com/terraform/language/functions/regexall
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform variable block documentation: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- Azure resource naming rules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Google Cloud project creation and project ID requirements: https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects
- AWS IAM identifiers: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- AWS IAM and STS quotas / name requirements: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- Semantic Versioning 2.0.0 specification: https://semver.org/
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Docker image tag documentation: https://docs.docker.com/engine/reference/commandline/tag/
- Docker distribution reference package: https://pkg.go.dev/github.com/distribution/reference

## Issues Found
- The post described `regexall` as "never errors." Updated this to say it returns an empty list when there are no matches, because malformed patterns can still fail.
- The S3 bucket validation pattern did not enforce several documented S3 bucket naming restrictions. Added checks for adjacent periods, IP-address-shaped names, and reserved S3 prefixes and suffixes.
- The Azure resource group validation allowed names ending with a period. Added a check to reject trailing periods and updated the error message.
- The Google Cloud project ID validation omitted restricted strings documented by Google Cloud. Added a check for `google` and `ssl` and updated the error message.
- The list-of-CIDRs example used only a loose regex but claimed every entry would be a valid CIDR block. Replaced it with `can(cidrhost(cidr, 0))` so Terraform validates parseable CIDR notation.
- The semantic version example allowed a leading `v`, omitted build metadata, and did not fully align with SemVer 2.0.0 prerelease rules. Replaced it with a SemVer-compatible pattern and updated examples.
- The Docker image tag reference pattern omitted underscore as a valid first character. Updated it to match Docker's documented tag pattern.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL snippets were reviewed against current Terraform documentation and corrected for documented behavior and provider naming rules.
