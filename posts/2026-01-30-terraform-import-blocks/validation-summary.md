# Validation Summary: How to Implement Terraform Import Blocks

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (1.5+ / 1.7+)
- HCL (HashiCorp Configuration Language)
- AWS provider (aws_instance, aws_vpc, aws_subnet, aws_security_group, aws_s3_bucket, aws_iam_role, aws_db_instance)
- Azure provider (azurerm_virtual_machine, azurerm_storage_account)
- Google Cloud provider (google_compute_instance, google_sql_database_instance)
- terraform-aws-modules/vpc/aws module (v5.0.0)
- AWS CLI, Azure CLI, gcloud CLI

## Sources Consulted
- [Terraform 1.5 release notes — config-driven import](https://www.hashicorp.com/en/blog/terraform-1-5-brings-config-driven-import-and-checks)
- [Terraform v1.5.0 release notes (GitHub)](https://github.com/hashicorp/terraform/releases/tag/v1.5.0)
- [Terraform v1.7.0 release notes (GitHub)](https://github.com/hashicorp/terraform/releases/tag/v1.7.0) — for `for_each` in import blocks
- [terraform-aws-modules/terraform-aws-vpc v5.0.0 source](https://github.com/terraform-aws-modules/terraform-aws-vpc/blob/v5.0.0/main.tf)
- [google_compute_instance docs (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance)
- [google_sql_database_instance docs (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance)
- [azurerm_virtual_machine docs (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine)
- Terraform import block official documentation

## Issues Found
- **`for_each` in import blocks requires Terraform 1.7, not 1.5.** The post introduces import blocks as a Terraform 1.5 feature, but uses `for_each` inside an import block without noting the version requirement. `for_each` support inside import blocks was added in Terraform 1.7.0 (January 2024). A reader on Terraform 1.5 or 1.6 would hit an error. **Fix:** Added "(requires Terraform 1.7 or later)" to the introductory sentence of the "Using For Each with Imports" section.

## Review Notes
- The `terraform plan -generate-config-out=FILE` flag is correctly attributed to Terraform 1.5.
- The basic `import { to = ..., id = ... }` block syntax is correct.
- The terraform-aws-modules/vpc/aws v5.0.0 internal addresses (`aws_vpc.this[0]`, `aws_subnet.public[0]`) match the upstream module source. The import target `module.vpc.aws_vpc.this[0]` is correct when the module call has no `count` or `for_each` on the module block itself (as is the case in the post's example).
- Provider-specific ID formats (AWS, Azure, GCP) match the official provider documentation.
- The Azure example uses `azurerm_virtual_machine`, which is the older/legacy resource. The newer recommended resources are `azurerm_linux_virtual_machine` and `azurerm_windows_virtual_machine`. The legacy resource still exists and the import ID format shown is correct, so this is not a technical error — just worth noting that newer projects typically use the split resources.
- AWS resource IDs in the examples (e.g., `vpc-0a1b2c3d4e5f6g7h8`) include non-hex characters (`g`, `h`). Real AWS IDs are hexadecimal, but these are clearly placeholder values for illustration; this is a common convention in tutorials and not a technical defect.
- Mermaid diagrams are syntactically valid.
- The `cidrsubnet`, `count`, `for_each`, and `each.key`/`each.value` Terraform language usages are all correct.
- The `protocol = "-1"` in the security group egress rule correctly represents "all protocols" in the AWS provider.
