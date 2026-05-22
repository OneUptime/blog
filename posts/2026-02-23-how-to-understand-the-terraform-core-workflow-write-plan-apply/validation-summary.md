# Validation Summary: How to Understand the Terraform Core Workflow (Write Plan Apply)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform configuration language (HCL)
- Terraform state, plans, and applies
- AWS provider resources for EC2 instances and security groups
- Graphviz DOT output for Terraform dependency graphs

## Sources Consulted
- Terraform CLI overview: https://developer.hashicorp.com/terraform/cli/commands
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform graph command reference: https://developer.hashicorp.com/terraform/cli/commands/graph
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform resource behavior documentation: https://developer.hashicorp.com/terraform/language/resources/behavior
- Terraform dependency graph internals: https://developer.hashicorp.com/terraform/internals/graph
- AWS provider aws_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider aws_security_group resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The initial AWS example created an `aws_security_group` but did not attach it to the `aws_instance`, so the "web server setup" did not actually associate the instance with the HTTP security group. Added `vpc_security_group_ids = [aws_security_group.web_sg.id]` to the instance.
- The initial AWS security group example used inline `ingress` and `egress` blocks. The current AWS provider documentation recommends using `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources instead. Replaced the inline rules with dedicated rule resources while preserving the same HTTP inbound and all-outbound behavior.

## Review Notes
- The Terraform CLI commands and flags shown in the post are current and match official command documentation.
- The discussion of saved plans, speculative plans, state refresh during planning, dependency ordering, `-parallelism`, remote state, and state locking is consistent with official Terraform documentation.
- Terraform CLI is not installed in this local environment, so command behavior was verified against official documentation rather than local `terraform --help` output.
