# Validation Summary: How to Handle Breaking Changes During Terraform Upgrades

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform (core, CLI)
- AWS provider (hashicorp/aws), specifically the v3→v4 S3 refactor and v4→v5 changes
- Azure provider (hashicorp/azurerm) — upgrade guide reference
- Google provider (hashicorp/google) — upgrade guide reference
- Terraform `moved` blocks (introduced in Terraform 1.1)
- Terraform `lifecycle` blocks (`ignore_changes`)
- Terraform state management commands (`terraform state push`, `terraform refresh`)
- GitHub Actions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`)
- AWS CLI (`aws s3api get-object`)

## Sources Consulted
- Terraform Provider Configuration docs: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform Provider Requirements docs: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform `provider` block reference: https://developer.hashicorp.com/terraform/language/block/provider
- HashiCorp Support: "How-to use multiple versions of a Terraform provider in one configuration": https://support.hashicorp.com/hc/en-us/articles/4538366582931
- AWS Provider v4 upgrade guide (S3 bucket refactor): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-4-upgrade
- AWS Provider v5 upgrade guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade
- Terraform `moved` blocks documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring

## Issues Found

**Issue 1: Incorrect claim about provider aliases supporting multiple provider versions side by side.**

The original "Gradual Adoption Strategy" section showed this example:

```hcl
provider "aws" {
  alias   = "new"
  region  = "us-east-1"
  version = "~> 5.0"
}
```

…with the caption "Use provider aliases to run old and new versions side by side". This is technically wrong on two counts:

1. Provider aliases create multiple *configurations* (e.g., different regions/accounts) of the **same resolved provider version**. They cannot pin one alias to v5 and another to v4 — Terraform resolves a single version per source address per configuration. The supported workaround is to declare the provider under two different *local names* in `required_providers`, each pointing at the same `source` but with different version constraints.
2. The `version` argument inside a `provider` block has been deprecated since Terraform 0.13 (2020). Version constraints belong in `terraform.required_providers`.

**Fix applied:** Rewrote the section to (a) explain that a single configuration uses one provider version, so gradual adoption means splitting across multiple root configurations/workspaces, and (b) show the correct `required_providers` syntax, plus the two-local-names pattern for the rare case where two versions are needed in one configuration.

## Review Notes

- The `monitoring` attribute on `aws_instance` example (showing a string→boolean type change) is presented as illustrative under "Provider upgrades may change attribute names, types, or default values". The specific `monitoring` attribute has been a boolean for a long time, so this is a hypothetical pattern rather than a real historical change. Left as-is since the framing uses "may" and the pattern itself (type changes happening across provider upgrades) is real.
- The `http_tokens` default-change example is a plausible illustration of the kind of default-value change that occurs across provider upgrades; the syntax shown is correct.
- The `aws_s3_bucket` → `aws_s3_bucket_acl` / `aws_s3_bucket_versioning` refactor example is accurate for AWS provider v4.0+.
- The `terraform refresh` command still works but is now considered legacy; `terraform apply -refresh-only` is the recommended modern equivalent. Not flagged as an error since the original command remains functional.
- The `moved` block syntax shown is correct and matches Terraform 1.1+ behavior.
- GitHub Actions versions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`, `terraform_version: "1.9"`) are valid; Terraform 1.9 is older than current (≈1.12 as of mid-2026) but still supported.
