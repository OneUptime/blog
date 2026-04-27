# Validation Summary: How to Create Nested Maps from Flat Data in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform-compatible expressions: `for` expressions, `flatten`, `distinct`, `keys`, `yamldecode`, `file`, `cidrsubnet`
- AWS provider resources (`aws_vpc`, `aws_subnet`) used as illustrative examples
- YAML configuration files consumed via `yamldecode`

## Sources Consulted
- OpenTofu `keys()` function documentation: https://opentofu.org/docs/language/functions/keys/
- OpenTofu `provider` resource meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/resource-provider/
- OpenTofu `cidrsubnet()` function documentation: https://opentofu.org/docs/language/functions/cidrsubnet/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `flatten()` function documentation: https://opentofu.org/docs/language/functions/flatten/

## Issues Found
1. **Invalid provider meta-argument syntax (Section: Nested Map from YAML Configuration).**
   The original code contained `provider = aws.${replace(each.value.region, "-", "_")}`, which is not valid HCL. The `provider` meta-argument does not accept string interpolation or arbitrary expressions; OpenTofu requires either a static reference (`aws.alias_name`) or, when the provider configuration uses `for_each`, bracket-notation indexing such as `aws.by_region[each.key]`. Since the example is about flattening nested data for `for_each` and not about dynamic providers, I removed the line entirely so the resource block uses the default AWS provider configuration. This keeps the example focused on the post's topic and fixes the syntax error.

2. **Incorrect `keys()` ordering comment (Section: Building Hierarchical Tag Policies).**
   The original comment claimed `keys(local.tag_policy_matrix.required_tags["prod"])` would return `["Environment", "CostCenter", "Owner", "DataClass"]` (the declaration order). According to the OpenTofu docs, `keys()` returns keys in lexicographical order. Updated the comment to `["CostCenter", "DataClass", "Environment", "Owner"]` and added a note that `keys()` sorts lexicographically.

3. **Incorrect `subnet_plan` output values (Section: Multi-Dimensional Subnet Planning).**
   The code applies `cidrsubnet` twice with `newbits = 4`, producing `/24` subnets from a `/16` base, but the comment showed `/20` subnets at addresses that don't match the actual computation (e.g., `10.0.0.0/20`, `10.0.64.0/20`, `10.0.128.0/20`). Updated the comment to reflect the actual result of the nested `cidrsubnet` calls: `/24` subnets at `10.0.0.0/24`, `10.0.1.0/24`, `10.0.2.0/24` for `public`; `10.0.16.0/24`, `10.0.17.0/24`, `10.0.18.0/24` for `private`; and `10.0.32.0/24`, `10.0.33.0/24` for `data`.

## Review Notes
- The `for` expression patterns (nested map construction, double-nested `flatten` for projection to a flat map keyed by composite strings) are idiomatic and match OpenTofu/Terraform documentation guidance.
- The `aws_subnet.planned` block references `aws_vpc.main.id`, which is not defined in the snippet. This is acceptable because the snippet is illustrative of the pattern, but readers reproducing it locally will need to define an `aws_vpc.main` resource.
- The hardcoded `availability_zone = "us-east-1${each.value.zone}"` ties the example to one region; this is fine for illustration but worth noting if readers adapt the pattern to multi-region deployments.
- The first nested-map construction uses `distinct([for c in local.instance_configs : c.region])` to derive top-level keys. This is correct, though a more concise alternative is `{ for c in ... : c.region => ... }` with a grouping `for` (`...` ellipsis). Both styles are valid; the post's choice is fine and arguably easier to read for newcomers.
