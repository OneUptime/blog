# Validation Summary: How to Use the matchkeys Function in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- Infrastructure as Code

## Sources Consulted
- OpenTofu `matchkeys` function documentation: https://opentofu.org/docs/language/functions/matchkeys/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- AWS provider `aws_subnet` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The post omitted an important `matchkeys()` constraint from the OpenTofu documentation: `values_list` and `keys_list` must be the same length. I added that requirement to the explanation and syntax section so the function behavior is described accurately.
- The `matchkeys vs for Expression Filter` example used invalid HCL syntax by assigning `local.result1` and `local.result2` outside a `locals` block. I wrapped the example in a `locals` block and kept the equivalent `for` expression logic intact.
- The same comparison example labeled the `for` expression as an object-oriented example even though it operates on parallel lists. I corrected that comment so it matches the code being shown.

## Review Notes
- The AWS examples are consistent with current AWS provider documentation, but they are illustrative snippets and still assume surrounding configuration such as provider setup and input values like `var.vpc_id` or a defined `data.aws_ami.amazon_linux`.
- OpenTofu's official documentation notes that `for` expressions are often preferable for readability when possible, even though the `matchkeys()` examples in this post are valid.
