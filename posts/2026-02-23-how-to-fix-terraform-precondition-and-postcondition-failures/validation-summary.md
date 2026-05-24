# Validation Summary: How to Fix Terraform Precondition and Postcondition Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Terraform (v1.2+ custom conditions)
- HCL (HashiCorp Configuration Language)
- AWS provider for Terraform (aws_instance, aws_subnet, aws_ami, aws_lb, aws_lb_target_group)
- Terraform CLI commands (`terraform plan`, `terraform apply`, `-replace`)

## Sources Consulted
- Terraform Custom Conditions docs: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform `taint` command docs: https://developer.hashicorp.com/terraform/cli/commands/taint
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform v1.2 release notes (preconditions/postconditions introduction)

## Issues Found

1. **Inverted CIDR-prefix comparison (Error Type 3 fix example).**
   The original example used `var.subnet_cidr_size >= 24` paired with the error message "Subnet must be at least a /24 to have enough IPs." This is mathematically wrong: a `>= 24` check permits /24, /25, /26..., which have *fewer* IPs, not more. Updated the comparison to `<= 24` and clarified the error message to reference prefix length (e.g., "/24, /23, /22") so the condition and message agree.

2. **Deprecated `terraform taint` command.**
   The "Remove and re-add" recovery step used `terraform taint aws_instance.web` followed by `terraform apply`. The `taint` command has been deprecated since Terraform 0.15.2 in favor of `terraform apply -replace="ADDRESS"`. Replaced the snippet with the `-replace` flag and added a one-line note explaining the deprecation.

3. **Paraphrased self-reference error message.**
   The shown error block ("Error: Self reference in precondition / Preconditions cannot use 'self' references...") was not Terraform's actual diagnostic. Replaced with the real diagnostic shape: "Error: Invalid reference ... The 'self' object is not available in this context. This object can be used only from within the 'postcondition' and 'provisioner' blocks." so the error text matches what a user would actually encounter.

## Review Notes
- The post correctly limits output blocks to `precondition` only (no postcondition), which matches Terraform's behavior — outputs do not support postconditions.
- The post correctly places `precondition` directly inside the `output` block (no `lifecycle` wrapper), which is the right syntax for outputs.
- Data source examples correctly use `lifecycle { postcondition { ... } }` — data sources do support `lifecycle` blocks limited to precondition/postcondition.
- The `try(self.credit_specification[0].cpu_credits, "standard")` pattern is correct: `credit_specification` is a nested block on `aws_instance` exposed as a list in HCL.
- The shown error stack traces (e.g., "Error: Resource precondition failed" with line context) are reasonable representations of Terraform's actual output format.
- Authors may want to reference `validation` blocks on `variable` declarations as an alternative for plain input validation (often more appropriate than resource preconditions for catching bad inputs early); not strictly an error, just a possible future improvement.
