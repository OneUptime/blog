# Validation Summary: How to Fix Terraform Version Constraint Errors

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (HCL configuration, `required_version`, `~>` pessimistic constraint)
- tfenv (Terraform version manager, `.terraform-version` file)
- HCP Terraform / Terraform Cloud (Workspaces API)
- OpenTofu
- GitHub Actions (`hashicorp/setup-terraform@v3`)
- GitLab CI (`hashicorp/terraform` Docker image)
- Terraform dependency lock file (`.terraform.lock.hcl`)
- Terraform provider plugin protocol (v5/v6)

## Sources Consulted
- [Terraform Version Constraints documentation](https://developer.hashicorp.com/terraform/language/expressions/version-constraints)
- [Terraform `required_version` settings](https://developer.hashicorp.com/terraform/language/settings)
- [Terraform 1.5 release blog (import/check blocks)](https://www.hashicorp.com/en/blog/terraform-1-5-brings-config-driven-import-and-checks)
- [Terraform 1.6 release blog (test framework)](https://www.hashicorp.com/en/blog/terraform-1-6-adds-a-test-framework-for-enhanced-code-validation)
- [Terraform 1.7 release notes (removed blocks)](https://developer.hashicorp.com/terraform/language/resources/syntax#removing-resources)
- [tfenv GitHub repository](https://github.com/tfutils/tfenv)
- [hashicorp/setup-terraform v3](https://github.com/hashicorp/setup-terraform/tree/v3)
- [HCP Terraform Workspaces API](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces)
- [Terraform Dependency Lock File](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [OpenTofu v1.x Compatibility Promises](https://opentofu.org/docs/language/v1-compatibility-promises/)
- [HashiCorp Discuss: Plugin Protocol v6 compatibility](https://discuss.hashicorp.com/t/plugin-protocol-version-6-compatibility-with-terraform-cli-v1-0-8/59621)

## Issues Found
No technical issues found. All verified items:

- Pessimistic `~>` operator semantics (`~> 1.5.0` → patch only; `~> 1.5` → minor only): correct.
- Version constraint operators (`>=`, `<`, `!=`, comma-separated combinations, exact match): correct.
- Terraform feature-by-version list (1.1 `moved`, 1.2 pre/postconditions, 1.3 `optional()`, 1.5 `import`/`check`, 1.6 `terraform test`, 1.7 `removed`): all correct.
- tfenv usage and `.terraform-version` file: correct.
- `hashicorp/setup-terraform@v3` GitHub Action: correct.
- HCP Terraform Workspaces API endpoint and JSON:API attribute name `terraform-version` (kebab-case): correct per official docs. Initially flagged but confirmed correct on direct verification of HashiCorp documentation.
- Error message text for "Unsupported Terraform Core version": matches Terraform CLI output format.
- Provider plugin protocol v6 introduced in Terraform 1.0; pre-1.0 versions emit the cited error: correct.
- `.terraform.lock.hcl` filename and `terraform init -upgrade` flag: correct.
- OpenTofu honors `terraform {}` block with `required_version`; v1.6.0 was the first stable release: correct.

## Review Notes
- The phrasing "Check what version features you actually use" next to `terraform validate` is slightly imprecise — `terraform validate` checks syntax/logic against the installed CLI but does not directly enumerate which features require which versions. Not technically wrong (running validate with a target version will surface incompatibilities), but a reader could misread it. Left as-is since it is not factually incorrect.
- The OpenTofu compatibility section is accurate today but may need revisiting as OpenTofu and Terraform versions diverge further.
- The post does not call out that `required_version` only constrains the Terraform CLI core version, not provider plugin versions (which use `required_providers`). This distinction is implicit in the structure but could be made clearer for newer readers. Not a correctness issue.
