# Validation Summary: How to Use Consistent File Layout in OpenTofu Projects

## Status
validated

## Post Type
Guide / Best Practices Tutorial

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HCL (HashiCorp Configuration Language)
- AWS provider (ECS, VPC, AMI, availability zones, caller identity)
- tflint
- Git (.gitignore patterns)

## Sources Consulted
- OpenTofu documentation - Standard Module Structure: https://opentofu.org/docs/language/modules/develop/structure/
- OpenTofu documentation - Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu documentation - Locals: https://opentofu.org/docs/language/values/locals/
- OpenTofu documentation - Outputs: https://opentofu.org/docs/language/values/outputs/
- OpenTofu documentation - Data Sources: https://opentofu.org/docs/language/data-sources/
- OpenTofu documentation - Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu documentation - Variable definition files (.tfvars): https://opentofu.org/docs/language/values/variables/#variable-definitions-tfvars-files
- HashiCorp Terraform Registry - Module Publishing Requirements: https://developer.hashicorp.com/terraform/registry/modules/publish
- AWS documentation - Amazon Linux 2 AMI naming
- tflint documentation: https://github.com/terraform-linters/tflint
- Git documentation - gitignore patterns: https://git-scm.com/docs/gitignore

## Issues Found
No technical issues found.

## Review Notes
- The HCL code examples are all syntactically correct and follow standard OpenTofu/Terraform conventions.
- The relationship between `providers.tf` and `versions.tf` is somewhat imprecise — in common practice, `versions.tf` typically holds the `terraform` block with `required_version` and `required_providers`, while `providers.tf` holds `provider` configuration blocks. The post acknowledges this overlap by calling versions.tf an "alternative" — both patterns are seen in the wild and neither is strictly wrong.
- The Amazon Linux 2 AMI filter pattern (`amzn2-ami-hvm-*-x86_64-gp2`) is technically correct, though Amazon Linux 2 reached end of standard support on June 30, 2025 (extended support continues). New deployments may want to use Amazon Linux 2023 (`al2023-ami-*-x86_64`). Since this is illustrative example code rather than a recommendation, no change was needed.
- There is a slight tension between the standard layout listing `terraform.tfvars` as "committed if non-sensitive" and the later .gitignore section excluding `*.tfvars`. The .gitignore comment ("exclude files with real secrets") clarifies the intent — both approaches are valid depending on team policy.
- OpenTofu also supports `tofu.tfvars` (added in newer versions) as an alternative, but `terraform.tfvars` remains supported and is the more widely-used convention.
- The locals.tf example references `var.company` and `var.team` which are not declared in the truncated variables.tf example shown. This is acceptable in isolated illustrative examples but readers should declare these in their own variables.tf.
