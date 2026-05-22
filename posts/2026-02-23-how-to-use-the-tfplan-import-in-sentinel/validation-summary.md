# Validation Summary: How to Use the tfplan Import in Sentinel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Enterprise policy enforcement
- Sentinel policy language
- Sentinel `tfplan/v2` import
- Terraform AWS provider resources

## Sources Consulted
- HashiCorp Developer: `tfplan/v2` Sentinel import reference - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Developer: `tfstate/v2` Sentinel import reference - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfstate-v2
- HashiCorp Developer: Sentinel language specification - https://developer.hashicorp.com/sentinel/docs/language/spec
- Terraform Registry: AWS provider `aws_s3_bucket` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform Registry: AWS provider `aws_s3_bucket_versioning` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning

## Issues Found
- The code fences were marked as `python`, but the snippets are Sentinel policies. Changed them to `sentinel` for accurate language identification.
- The S3 versioning example checked `aws_s3_bucket.change.after.versioning[0].enabled`. Current AWS provider guidance recommends managing bucket versioning with `aws_s3_bucket_versioning`, whose planned attributes use `versioning_configuration[0].status`. Updated the example accordingly.
- The output sensitivity example used `tfplan.output_changes` and `output.sensitive`, but `tfplan/v2` `output_changes` entries expose `name` and `change`, not a top-level `sensitive` field. Updated the example to use `tfplan.planned_values.outputs`, which follows the `tfstate/v2` output representation with `sensitive`.
- The output sensitivity example used an `if` statement inside an `all` quantifier body. Sentinel quantifier bodies are boolean expressions, so this was rewritten as a boolean expression.
- The instance type change example used a standalone `print` call inside an `all` quantifier body. Since `print` returns `true`, it was joined with the validation expression using `and`.

## Review Notes
The post is technically relevant and accurate after the fixes. The examples still use `contains` for action filtering, which is valid Sentinel and useful for matching replacements, but HashiCorp's `tfplan/v2` documentation recommends exact list comparison when a policy needs to distinguish exact operation order such as normal replacement versus create-before-destroy.
