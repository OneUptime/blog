# Validation Summary: How to Use Check Blocks vs Postconditions in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu custom conditions (`check`, `assert`, `postcondition`)
- HCL
- AWS provider examples (`aws_s3_bucket`, `aws_ebs_volume`, `aws_lb`)
- HTTP data source examples

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Resource Blocks documentation: https://opentofu.org/docs/language/resources/syntax/
- Terraform Registry AWS `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/-/aws/latest/docs/resources/ebs_volume
- Terraform Registry AWS `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform Registry AWS `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb

## Issues Found
1. **Incorrect execution timing in the introduction, comparison table, and conclusion:** The post said both mechanisms run after resource creation and described postconditions as creation-time checks. OpenTofu documents that `check` blocks run at the end of every plan and apply, while `postcondition` blocks run after OpenTofu evaluates the associated resource or data source and may be checked during plan or apply depending on when values are known. Updated those explanations accordingly.
2. **Incorrect failure behavior for postconditions:** The comparison table and failure-output section said a failed postcondition taints the resource. OpenTofu documents that a failed postcondition raises an error and blocks the current operation; it prevents downstream dependent changes but does not document automatic tainting for postcondition failures. Removed the taint claim and corrected the wording.
3. **Invalid/incomplete postcondition example:** The original `aws_db_instance` example omitted required RDS configuration, so it was not a valid working example. Replaced it with the documented `data "http"` postcondition example from the OpenTofu docs, which correctly demonstrates `self` access.
4. **Invalid/incomplete EBS example:** The original `aws_ebs_volume` example omitted the required `availability_zone` argument. Added `availability_zone` so the resource block is syntactically valid according to the AWS provider documentation.
5. **Overstated “continuous” behavior for check blocks:** The post framed `check` blocks as continuous monitoring. In standard OpenTofu usage, checks run on every plan and apply; continuous background validation requires supporting backend features. Adjusted the wording to “recurring” validation during plan/apply runs.

## Review Notes
- The `check` block examples are consistent with the OpenTofu docs: they are top-level, support one scoped data source, and failed assertions are warnings rather than blocking errors.
- The `postcondition` guidance is now aligned with the official distinction between non-blocking infrastructure-wide checks and blocking guarantees on a specific resource or data source.
- The remaining AWS snippets are illustrative resource fragments rather than full standalone modules; readers still need normal provider configuration and real environment-specific values.
