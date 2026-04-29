# Validation Summary: How to Manage Large State Files for Performance in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state management
- OpenTofu workspaces
- HCL
- AWS S3
- AWS CLI
- AWS provider resources and data sources

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu state purpose docs: https://opentofu.org/docs/language/state/purpose/
- OpenTofu workspaces docs: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu CLI workspaces docs: https://opentofu.org/docs/cli/workspaces/
- OpenTofu `workspace new` docs: https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu `state rm` docs: https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu `state list` docs: https://opentofu.org/docs/cli/commands/state/list/
- AWS CLI `s3 ls` docs: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- Amazon S3 versioning docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html
- Amazon S3 noncurrent version transition docs: https://docs.aws.amazon.com/AmazonS3/latest/API/API_NoncurrentVersionTransition.html
- Amazon S3 noncurrent version expiration docs: https://docs.aws.amazon.com/AmazonS3/latest/API/API_NoncurrentVersionExpiration.html
- Terraform Registry `aws_s3_bucket_lifecycle_configuration` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform Registry `aws_iam_policy` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy
- Terraform Registry `aws_iam_role_policy_attachment` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment

## Issues Found
- The post claimed the refresh phase can take "10-20 minutes" with 1,000+ resources. That number was not supported by the official docs, so it was softened to "can take many minutes."
- The `-refresh=false` section was missing the documented caveat that skipping refresh can produce an incomplete or incorrect plan if external changes occurred. The explanation was updated to reflect that.
- The `-target` section presented targeting as a general scoping technique. OpenTofu documents targeting as an exceptional-use feature, so the guidance was corrected and a note was added to prefer splitting configurations for routine performance work.
- The post stated "AWS default is 100 calls/second per service," which is not a general AWS rule. That note was replaced with a provider/API-specific throttling warning.
- The workspace section implied workspaces are a general per-environment isolation mechanism. It was corrected to note that workspaces are appropriate only when environments can share a backend and credentials model, and that they are not a substitute for separate backends or access controls.
- The section titled "Enable State Caching with Remote Backends" was technically incorrect. S3 lifecycle rules manage historical object versions and storage cost; they do not cache state or speed up `plan`/`apply`. The heading and explanation were corrected accordingly.
- The `tofu state rm` section described orphaned resources inaccurately. It was updated to explain that `tofu state rm` removes bindings from state, not remote objects, and that OpenTofu may propose recreating the resource if it is still declared in configuration.
- The conclusion was updated to match the corrected `tofu state rm` guidance by referring to removing unneeded state bindings rather than orphaned resources.

## Review Notes
- The AWS provider examples are Terraform-compatible HCL and remain valid for OpenTofu usage.
- `tofu` was not installed in the local environment, so command validation was done against the official OpenTofu documentation rather than local `--help` output.
