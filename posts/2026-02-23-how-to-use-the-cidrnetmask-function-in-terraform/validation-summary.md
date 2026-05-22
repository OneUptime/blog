# Validation Summary: How to Use the cidrnetmask Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform IP network functions
- IPv4 CIDR notation and dotted-decimal subnet masks
- Terraform template files
- Terraform local and null providers

## Sources Consulted
- HashiCorp Developer Documentation: cidrnetmask Function: https://developer.hashicorp.com/terraform/language/functions/cidrnetmask
- HashiCorp Developer Documentation: cidrhost Function: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- HashiCorp Developer Documentation: templatefile Function: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Developer Documentation: Strings and Templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform Registry: hashicorp/local local_file Resource: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Cisco IOS Security Configuration Guide: IP Access List Overview: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_data_acl/configuration/15-sy/sec-data-acl-15-sy-book/sec-access-list-ov.html

## Issues Found
- The firewall example used Cisco IOS-style `access-list 100 permit ip ...` syntax while passing `cidrnetmask(cidr)`. Cisco IOS ACLs use wildcard masks in that position, not subnet masks. I changed the example to a generic firewall rule format that explicitly expects a subnet mask, which matches what `cidrnetmask` returns.

## Review Notes
- Terraform CLI is not installed in this environment, so local execution with `terraform console` or `terraform validate` was not possible.
- The core `cidrnetmask` behavior, IPv4-only limitation, example subnet mask values, `cidrhost` usage for network and gateway addresses, and `templatefile` usage were verified against HashiCorp documentation.
