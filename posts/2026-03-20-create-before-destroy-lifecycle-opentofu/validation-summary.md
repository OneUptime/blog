# Validation Summary: How to Use create_before_destroy Lifecycle in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible) `lifecycle` meta-argument
- HashiCorp Configuration Language (HCL)
- AWS provider resources: `aws_instance`, `aws_security_group`, `aws_launch_template`, `aws_autoscaling_group`, `aws_db_instance`

## Sources Consulted
- OpenTofu lifecycle docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- Terraform lifecycle docs: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform Plugin SDK `PrefixedUniqueId`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-sdk/v2/helper/resource#PrefixedUniqueId

## Issues Found

1. **Misleading `name_prefix` generated-name example.** The post showed `# AWS generates: web-sg-20250101120000`, implying the suffix is a human-readable timestamp produced by AWS. In reality, the Terraform/OpenTofu provider (not AWS) appends a 26-character unique ID (a high-resolution timestamp followed by an 8-hex-digit counter) via `PrefixedUniqueId`. Updated the comment to a representative example of the actual format and clarified that the provider, not AWS, appends the suffix.

2. **RDS example used a fixed `identifier` with `create_before_destroy = true`.** The post correctly explains for security groups that fixed names cause conflicts during replacement, but the RDS example contradicted this guidance: a fixed `identifier = "myapp-db"` combined with `create_before_destroy = true` will fail because RDS identifiers must be unique within an account/region, so the new instance can't be created while the old one still exists. Changed to `identifier_prefix = "myapp-db-"`, which is the documented, supported solution and matches the `name_prefix` pattern used elsewhere in the post.

## Review Notes
- The "dependency propagation" section is technically accurate per the docs ("Terraform propagates and applies create_before_destroy behavior to all resource dependencies"). Setting `create_before_destroy = true` on the dependent `aws_instance` is redundant but not wrong, since you cannot set it to `false` on a dependent (would produce a cycle error). Left as-is.
- For the ASG/launch-template example, `aws_launch_template.web.latest_version` is a valid exported attribute and the configuration is sound.
- The post does not pin a specific OpenTofu or AWS provider version; the lifecycle semantics described apply to all current OpenTofu releases (1.x) and modern hashicorp/aws provider versions (4.x and 5.x).
- Worth noting (but not corrected, as it's a use-case framing rather than a technical error): most common RDS attribute changes (e.g., `instance_class`) are applied in-place rather than triggering replacement, so `create_before_destroy` on RDS is only relevant for the smaller set of attributes that force replacement.
