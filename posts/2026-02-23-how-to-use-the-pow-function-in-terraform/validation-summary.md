# Validation Summary: How to Use the pow Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform numeric functions (`pow`, `log`, `ceil`, `floor`)
- Terraform collection and IP network functions (`range`, `contains`, `cidrsubnet`)
- CIDR subnet sizing and AWS VPC reserved subnet IP addresses

## Sources Consulted
- HashiCorp Terraform `pow` function documentation: https://developer.hashicorp.com/terraform/language/functions/pow
- HashiCorp Terraform `log` function documentation: https://developer.hashicorp.com/terraform/language/functions/log
- HashiCorp Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- HashiCorp Terraform `range` function documentation: https://developer.hashicorp.com/terraform/language/functions/range
- HashiCorp Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- HashiCorp Terraform input variable validation documentation: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- AWS VPC subnet sizing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html

## Issues Found
- The storage capacity example used `KB`, `MB`, `GB`, and `TB` labels for 1024-based calculations. Those labels are ambiguous and often decimal SI units, while 1024-based byte units are more precisely written as `KiB`, `MiB`, `GiB`, and `TiB`. Updated the prose, validation list, unit multiplier keys, default value, and output field from `gb` to `gib`.

## Review Notes
Terraform CLI was not installed in the review environment, so examples were reviewed statically against official HashiCorp documentation. The Terraform function usage and AWS reserved-IP explanation match the cited official documentation.
