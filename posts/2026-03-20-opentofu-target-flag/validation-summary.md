# Validation Summary: How to Use the -target Flag for Targeted Plans in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI)
- Terraform (compatible workflow)
- AWS provider (resource examples: `aws_s3_bucket`, `aws_instance`, `aws_vpc`, `aws_security_group`)
- Infrastructure as Code

## Sources Consulted
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Resource Address syntax documentation: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu `tofu destroy` command documentation: https://opentofu.org/docs/cli/commands/destroy/

## Issues Found
No technical issues found.

All claims and examples verified against the official OpenTofu documentation:
- The `-target=ADDRESS` flag is valid for `tofu plan`, `tofu apply`, and `tofu destroy`.
- Module addressing (`module.networking`) and nested resource addressing (`module.networking.aws_vpc.main`) match the documented resource address syntax.
- `count` indexing (`aws_instance.web[0]`) and `for_each` keying (`aws_s3_bucket.buckets["production"]`) are correctly shown, including the recommended shell quoting to avoid glob/bracket interpretation.
- Multiple `-target` flags being combinable on a single invocation is documented.
- Automatic inclusion of upstream dependencies for targeted resources is accurate.
- The warning about incomplete/partially-applied state after a `-target` apply matches the official guidance ("Use `-target=ADDRESS` in exceptional circumstances only"). The warning text in the post is a slight paraphrase of the actual CLI output but is faithful to the meaning and follow-up guidance (run a full plan to verify state).

## Review Notes
- The warning message printed in the "Warning About Partial State" section is paraphrased rather than verbatim from the OpenTofu CLI output. The actual OpenTofu output is similar in meaning but uses slightly different wording (e.g., "some changes requested in the configuration may have been ignored and the output values may not be fully updated"). This is acceptable for a tutorial that explains the behavior, not the exact string.
- Resource names with hyphens (e.g., `aws_instance.old-web`) are valid in HCL — names must start with a letter or underscore but may contain hyphens thereafter.
- The post applies equally well to Terraform users since the `-target` flag and address syntax are compatible between the two tools at the time of writing.
