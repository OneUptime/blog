# Validation Summary: How to Use the values Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform collection functions
- Terraform `for_each` resources

## Sources Consulted
- HashiCorp Terraform `values` function documentation: https://developer.hashicorp.com/terraform/language/functions/values
- HashiCorp Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- HashiCorp Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform references to values documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- HashiCorp Terraform `sum`, `distinct`, `flatten`, `anytrue`, `can`, and `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform 1.14.0 console via the official HashiCorp Docker image for expression checks.

## Issues Found
- The `values with contains` example did not use `contains`; it used `anytrue`, `can`, and `regex` to check a substring. Changed the example to `contains(values(var.instance_types), "m5.xlarge")` so it matches the section title and Terraform's documented `contains` behavior.
- The `distinct(values(var.server_amis))` result was shown in insertion order, but Terraform returns values in lexicographical order by key before `distinct` is applied. Updated the expected result to `["ami-67890", "ami-12345"]`.
- The `flatten(values(var.team_members))` result was shown in insertion order, but Terraform orders map values by key. Updated the expected result to `["alice", "bob", "eve", "carol", "dave"]`.
- The DNS auditing example's expected list was shown in insertion order, but `values(var.dns_records)` is ordered by keys `api`, `mail`, and `www`. Updated the expected result to `["lb.example.com", "mail.example.com", "lb.example.com"]`.
- The object-type note claimed that `values` does not work with object types directly. Terraform's documentation treats maps and objects similarly in many expressions, and Terraform 1.14.0 console confirmed `values({ name = "myapp", port = 8080 })` returns the attribute values. Rewrote the note to show `values(local.config)`.

## Review Notes
The examples are illustrative and omit provider setup and surrounding resources such as `aws_vpc.main`, which is acceptable for a function-focused Terraform tutorial. The resource examples rely on current Terraform `for_each` behavior where resource references with `for_each` evaluate to maps of instance objects.
