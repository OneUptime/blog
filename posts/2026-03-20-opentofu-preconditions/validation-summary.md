# Validation Summary: How to Use Preconditions on Resources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- Terraform language: `lifecycle`, `precondition`, `postcondition`, variable `validation`
- HCL built-in functions: `startswith`, `contains`, `length`, `can`, `regex`, `try`, `cidrcontains`
- AWS provider resources used in examples: `aws_instance`, `aws_ami` (data source), `aws_s3_bucket`, `aws_db_subnet_group`, `aws_vpc` (data source), `aws_subnet`, `aws_rds_cluster`, `aws_eks_node_group`, `aws_eks_cluster`

## Sources Consulted
- [OpenTofu — Custom Conditions](https://opentofu.org/docs/language/expressions/custom-conditions/)
- [OpenTofu — Functions Reference](https://opentofu.org/docs/language/functions/)
- [OpenTofu — `cidrcontains` function](https://opentofu.org/docs/language/functions/cidrcontains/)
- [Terraform — Custom Conditions](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions)

## Issues Found

**Issue 1: Invalid use of `self` in a precondition block (section "Precondition on Data Source")**

The original example placed a `precondition` inside a data source's `lifecycle` block and referenced `self.architecture`:

```hcl
lifecycle {
  precondition {
    condition     = self.architecture == "x86_64"
    error_message = "AMI must be x86_64 architecture. Found: ${self.architecture}"
  }
}
```

This is incorrect. The `self` object is only available in `postcondition` blocks (and provisioner-related contexts) — not in `precondition` blocks. Preconditions are evaluated *before* the resource is created or the data source is read, so there is no instance to reference. The OpenTofu and Terraform documentation only demonstrate `self` in postcondition examples and explicitly state that "Resource postconditions can also use the `self` object to refer to attributes of each instance of the resource where they are configured."

**Fix applied:** Replaced the example with a valid precondition that validates an *input* to the data source (the `var.ami_owner_account` variable) before the data source is queried — using `can(regex("^[0-9]{12}$", var.ami_owner_account))` to ensure it is a 12-digit AWS account ID. This preserves the section's intent (a precondition on a data source) while using a pattern that is actually permitted in a precondition.

## Review Notes

- All other built-in functions used in the post (`startswith`, `contains`, `length`, `can`, `regex`, `try`, `cidrcontains`) were verified against the OpenTofu function reference. Note that `cidrcontains` is a relatively recent OpenTofu addition and is not available in upstream Terraform — it works as `cidrcontains(prefix, ip_or_prefix)` and returns a boolean, matching the post's usage.
- Multiple `precondition` blocks within a single `lifecycle` block are valid and evaluated independently, as shown in the "Multiple Preconditions" example.
- The "Preconditions vs Variable Validation" section's claim that variable `validation` cannot reference data sources is correct — variable validation can only reference the variable itself and (since Terraform 1.9 / OpenTofu 1.8) other input variables, but never resources or data sources.
- The conclusion's phrasing "Use preconditions to validate ... data source results" is acceptable when interpreted as preconditions on a *resource* that reference data source attributes (as demonstrated in the "Precondition on Data Source Results" section). Preconditions on the data source itself cannot validate the data source's own results — that requires a `postcondition`. Readers needing to validate a data source's own attributes should reach for `postcondition` instead.
