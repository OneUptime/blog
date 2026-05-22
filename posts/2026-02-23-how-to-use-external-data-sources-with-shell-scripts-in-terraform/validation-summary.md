# Validation Summary: How to Use External Data Sources with Shell Scripts in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform external provider
- Terraform HCL
- Bash shell scripting
- jq
- DNS lookups with dig
- Git CLI
- AWS CLI, including STS and ECR

## Sources Consulted
- Terraform external provider data source documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- Terraform language references documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- jq manual: https://jqlang.org/manual/
- BIND dig local help output (`dig -h`, BIND 9.18.39)
- Git status documentation: https://git-scm.com/docs/git-status
- AWS CLI STS get-caller-identity command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- AWS CLI ECR describe-images command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-images.html

## Issues Found
- The Git information script used `git diff --quiet` for the `dirty` result, which misses staged changes and untracked files. Changed it to use `git status --porcelain`, which Git documents as stable, script-friendly status output that includes index, working tree, and untracked-file status.
- The ECR script sorted all images and selected `imageTags[0]`, which can fail or return an invalid value if the latest image is untagged. Added `--filter tagStatus=TAGGED` to match the AWS CLI ECR filter options and ensure the query selects from tagged images.
- The error-handling template parsed `param1` with a default while later validating it as required. Changed `param1` parsing to `jq -r '.param1 // empty'` so the required-input validation can actually detect a missing value.

## Review Notes
- Terraform and AWS CLI were not installed in the local workspace, so Terraform provider behavior and AWS CLI flags were verified against official documentation rather than local command execution.
- The external provider examples correctly follow the protocol of JSON input on stdin, JSON object output on stdout, string result values, and stderr for diagnostics.
