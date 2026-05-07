# Validation Summary: How to Write Assertions in Test Run Blocks in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu test files (`*.tftest.hcl` / `run` and `assert` blocks)
- HCL
- AWS provider resources used as examples (`aws_s3_bucket`, `aws_instance`, `aws_subnet`, `aws_db_instance`, `aws_security_group`)

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu attributes-as-blocks documentation: https://opentofu.org/docs/language/attr-as-blocks/
- Terraform AWS Provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS Provider v6 upgrade guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- Terraform AWS Provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The list-membership example used `aws_s3_bucket.this.region`, which is outdated in current AWS provider documentation. I changed it to `aws_s3_bucket.this.bucket_region` to match the current exported attribute.
- The multiple-assertions section said failures "accumulate rather than stopping on the first failure." I tightened this to match the OpenTofu documentation more directly: OpenTofu evaluates all `assert` blocks in a `run` block.
- The conclusion described `expect_failures` broadly as covering "error paths." I clarified that it covers expected custom-condition failure paths, which is consistent with the OpenTofu docs and avoids implying provider-level error testing.

## Review Notes
- The post is technically relevant and contains executable OpenTofu/HCL examples.
- The `command = plan` guidance is consistent with OpenTofu's behavior that some conditions are only checkable once values are known; assertions against plan-time-known attributes are appropriate.
- The AWS `aws_security_group` example is technically plausible, but current provider guidance prefers `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources over inline security group rules for new configurations.
