# Validation Summary: How to Use Custom Conditions in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (custom conditions: variable validation, preconditions, postconditions)
- HCL (HashiCorp Configuration Language)
- Terraform AWS provider (`aws_ami`, `aws_instance`, `aws_s3_bucket`, `aws_lb`, `aws_db_instance`)
- Built-in functions: `contains`, `startswith`

## Sources Consulted
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu output values documentation (preconditions on outputs): https://opentofu.org/docs/language/values/outputs/
- HashiCorp Terraform Custom Conditions docs (parity with OpenTofu): https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- AWS provider resource schemas for `aws_ami` (data source), `aws_instance`, `aws_s3_bucket`, `aws_lb`, `aws_db_instance`
- Canonical AWS account ID for Ubuntu AMIs (099720109477) — confirmed correct

## Issues Found

1. **Invalid use of `self` in a `precondition` block on a data source.**
   - The `data "aws_ami" "ubuntu"` example used `condition = self.id != ""` inside a `precondition` block. The `self` symbol is only available in `postcondition` blocks — it cannot be used in preconditions because the resource/data source has not yet been read or created at that point. On a data source precondition this is doubly invalid since the AMI lookup hasn't run.
   - **Fix:** Replaced the condition with a true precondition that checks an input variable instead — verifying that `var.aws_region` is one of the supported regions before the AMI lookup runs. This keeps the example aligned with the section's premise (preconditions on a data source) while being technically valid.

2. **Incorrect claim that output blocks support postconditions.**
   - The post said: *"You can also add preconditions and postconditions to output blocks."* OpenTofu's `output` blocks support only `precondition` blocks, not `postcondition` blocks.
   - **Fix:** Updated the sentence to: *"You can also add preconditions to output blocks."* The example below the sentence already used only a `precondition`, so no code change was needed.

## Review Notes
- The remaining code samples are syntactically and semantically valid:
  - Multiple `validation` blocks per variable are correctly described as supported.
  - The `aws_instance` precondition correctly uses `var.instance_type` (not `self`).
  - The `aws_s3_bucket` postcondition correctly uses `self.region`, and `aws_lb` postcondition correctly uses `self.dns_name` — both real attributes exposed by the AWS provider.
  - The output `precondition` referencing `aws_db_instance.main.status` is valid; `status` is exposed by the `aws_db_instance` resource.
- The Canonical owner ID (`099720109477`) and the Ubuntu 22.04 AMI name pattern are accurate.
- The CLI references (`tofu validate`, `tofu plan`) and the timing claim ("conditions are evaluated during the plan phase") are accurate.
- Style/structure was left intact per the review guidelines; only technical errors were corrected.
