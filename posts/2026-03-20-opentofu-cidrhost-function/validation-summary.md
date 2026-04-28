# Validation Summary: How to Use the cidrhost Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (cidrhost function)
- HCL (HashiCorp Configuration Language)
- Terraform (compatible function)
- AWS provider (aws_network_interface, aws_subnet)
- CIDR / IP networking concepts

## Sources Consulted
- OpenTofu cidrhost function documentation: https://opentofu.org/docs/language/functions/cidrhost/
- Terraform cidrhost function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- OpenTofu console command documentation: https://opentofu.org/docs/cli/commands/console/
- AWS VPC DNS reservation (.2 in VPC CIDR): https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- AWS provider aws_network_interface resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface

## Issues Found
- **Syntax description inconsistency**: The Syntax section described `-1` as "last host", but the Basic Examples section (and standard networking convention) correctly identifies `-1` for a /24 block as the broadcast address and `-2` as the last usable host. Updated the Syntax description from `-1 = last host` to `-1 = last address` to remove the contradiction with the examples below it.

All `cidrhost` outputs were verified:
- `cidrhost("10.0.0.0/24", 1)` → "10.0.0.1" ✓
- `cidrhost("10.0.0.0/24", 10)` → "10.0.0.10" ✓
- `cidrhost("10.0.0.0/24", -2)` → "10.0.0.254" ✓
- `cidrhost("10.0.0.0/24", -1)` → "10.0.0.255" ✓
- `cidrhost("172.16.0.0/12", 1)` → "172.16.0.1" ✓
- `cidrhost("192.168.1.0/24", 100)` → "192.168.1.100" ✓
- `cidrhost("10.0.0.0/16", -2)` → "10.0.255.254" ✓

## Review Notes
- The AWS DNS server claim (at `cidrhost(vpc_cidr, 2)`) is correct — Amazon Route 53 Resolver is at the base of the VPC CIDR + 2.
- The `aws_network_interface` example uses the `private_ips` argument, which is still valid in the AWS provider; `private_ip_list` is an alternative for ordered assignment but not required here.
- The `tofu console` REPL command shown in the Step-by-Step Usage section is correct (OpenTofu's equivalent to `terraform console`).
- All example IP calculations are mathematically correct and would produce the documented output when run through `tofu console`.
