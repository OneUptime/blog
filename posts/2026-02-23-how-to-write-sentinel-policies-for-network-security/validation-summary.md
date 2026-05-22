# Validation Summary: How to Write Sentinel Policies for Network Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel
- Terraform / HCP Terraform policy enforcement
- Terraform `tfplan/v2` import
- AWS VPCs, security groups, network ACLs, VPC Flow Logs, subnets, VPC peering, and RDS

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel rules documentation: https://developer.hashicorp.com/sentinel/docs/language/rules
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfstate/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfstate-v2
- Terraform AWS Provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS Provider `aws_flow_log` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS Provider `aws_network_acl_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- Terraform AWS Provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS Provider `aws_vpc_peering_connection` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- Terraform AWS Provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The code blocks were labeled as `python` even though the examples are Sentinel policies. Changed the fences to `sentinel`.
- The security group policy only covered legacy `aws_security_group_rule` resources and inline rules. Added checks for the current AWS provider best-practice resources, `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`.
- The security group examples detected all-traffic rules using incorrect port assumptions. Updated the checks to use `protocol` / `ip_protocol` value `-1`, matching the Terraform AWS provider documentation.
- Several Sentinel snippets placed assignments and `if` statements directly inside `rule` or `all` expression bodies. Moved those checks into helper functions or boolean expressions so the examples conform to Sentinel's rule and quantifier syntax.
- The VPC flow log example imported `tfstate/v2` and declared `existing_flow_logs` but never used it. Removed the unused import and filter from the snippet.

## Review Notes
The VPC flow log example still checks that at least one flow log is created when one or more VPCs are created; it does not prove one flow log per new VPC. That is acceptable for an introductory example, but a production policy should correlate each `aws_flow_log` with the specific VPC, subnet, or ENI it protects.
